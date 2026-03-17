import { Router, Request, Response } from 'express'
import axios from 'axios'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../../.env') })

const router = Router()

interface EditRequestBody {
  imageBase64: string
  prompt: string
  maskBase64?: string
  aspectRatio?: string
  resolution?: string
}

interface EditResponseBody {
  resultImageBase64: string
  provider: string
  cost: number
  originalWidth?: number
  originalHeight?: number
}

const RUNNINGHUB_API_KEY = process.env.RUNNINGHUB_API_KEY || ''
const RUNNINGHUB_BASE_URL = process.env.RUNNINGHUB_BASE_URL || 'https://www.runninghub.ai'
const RUNNINGHUB_ENDPOINT = process.env.RUNNINGHUB_ENDPOINT || '/openapi/v2/rhart-image-n-pro/edit'
const RUNNINGHUB_WORKFLOW_ID = process.env.RUNNINGHUB_WORKFLOW_ID || ''

const MAX_POLL_ATTEMPTS = 60
const POLL_INTERVAL_MS = 2000

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '5:4', '4:5', '21:9', '1:4', '4:1', '1:8', '8:1']

function calculateAspectRatio(width: number, height: number): string {
  const ratio = width / height
  const ratios: Record<string, number> = {
    '1:1': 1, '16:9': 16/9, '9:16': 9/16,
    '4:3': 4/3, '3:4': 3/4, '3:2': 3/2,
    '2:3': 2/3, '5:4': 5/4, '4:5': 4/5,
    '21:9': 21/9, '1:4': 1/4, '4:1': 4/1,
    '1:8': 1/8, '8:1': 8/1
  }
  
  let closest = '1:1'
  let minDiff = Math.abs(ratio - 1)
  
  for (const [key, value] of Object.entries(ratios)) {
    const diff = Math.abs(ratio - value)
    if (diff < minDiff) {
      minDiff = diff
      closest = key
    }
  }
  
  return closest
}

/**
 * Uploads a base64 image to RunningHub to get a public URL
 */
const uploadFile = async (base64Data: string): Promise<string> => {
  const url = `${RUNNINGHUB_BASE_URL}/openapi/v2/file/upload`
  
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '')
  
  const response = await axios.post(url, {
    fileBase64: cleanBase64,
    fileName: `upload-${Date.now()}.png`
  }, {
    headers: {
      'Authorization': `Bearer ${RUNNINGHUB_API_KEY}`,
      'Content-Type': 'application/json'
    }
  })

  const code = response.data.code ?? response.data.errorCode
  const msg = response.data.msg ?? response.data.message

  if (code !== 0 && code !== "0") {
    throw new Error(`RunningHub Upload error (${code}): ${msg || 'Upload failed'}`)
  }

  return response.data.data.url
}

/**
 * Creates a task on RunningHub
 */
const createTask = async (
  imageBase64: string, 
  prompt: string, 
  maskBase64?: string,
  aspectRatio?: string,
  resolution: string = '4k'
): Promise<string> => {
  // First upload the image to get a public URL
  console.log('Uploading image to RunningHub...')
  const imageUrl = await uploadFile(imageBase64)
  console.log('Image uploaded:', imageUrl.substring(0, 50) + '...')

  const url = `${RUNNINGHUB_BASE_URL}${RUNNINGHUB_ENDPOINT}`

  // Use aspect ratio from frontend, fallback to image's original ratio
  const finalAspectRatio = aspectRatio || '4:3'

  const payload: any = {
    workflowId: RUNNINGHUB_WORKFLOW_ID,
    prompt: prompt,
    imageUrls: [imageUrl],
    aspectRatio: finalAspectRatio,
    resolution: resolution
  }

  console.log('Creating RunningHub task:', {
    workflowId: RUNNINGHUB_WORKFLOW_ID,
    prompt: prompt?.substring(0, 30),
    aspectRatio: finalAspectRatio,
    resolution
  })

  const response = await axios.post(url, payload, {
    headers: {
      'Authorization': `Bearer ${RUNNINGHUB_API_KEY}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  })

  // Check for error codes. Only throw if it's a clear error (non-zero value)
  const code = response.data.code ?? response.data.errorCode
  const msg = response.data.msg ?? response.data.message ?? response.data.errorMessage

  // Only consider it an error if 'code' is present and not 0, "0", or falsy like null/undefined/""
  if (code !== undefined && code !== null && code !== 0 && code !== "0" && code !== "") {
    console.log('RunningHub Raw Error Response:', JSON.stringify(response.data, null, 2))
    throw new Error(`RunningHub API error (${code}): ${msg || 'No message provided'}`)
  }

  const taskId = response.data.data?.taskId ?? response.data.taskId
  if (!taskId) {
    console.log('RunningHub Missing TaskId Response:', JSON.stringify(response.data, null, 2))
    throw new Error('No taskId returned from RunningHub API (Success but no ID)')
  }

  return taskId
}




/**
 * Polls for task results using the correct /openapi/v2/query endpoint (POST)
 */
const pollTaskStatus = async (taskId: string): Promise<string> => {
  const url = `${RUNNINGHUB_BASE_URL}/openapi/v2/query`
  
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await axios.post(url, { taskId }, {
      headers: { 
        'Authorization': `Bearer ${RUNNINGHUB_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })

    const code = response.data.code ?? response.data.errorCode
    const msg = response.data.msg ?? response.data.message ?? response.data.errorMessage

    if (code !== undefined && code !== null && code !== 0 && code !== "0" && code !== "") {
      throw new Error(`RunningHub status error (${code}): ${msg || 'No message provided'}`)
    }

    const taskData = response.data.data ?? response.data
    const status = taskData?.status



    if (status === 'SUCCESS' || status === 'success') {
      const results = taskData?.results
      
      if (Array.isArray(results) && results.length > 0) {
        // Correct RunningHub v2 format: results is an array of objects with url
        return results[0].url || results[0]
      } else if (results && results.images && Array.isArray(results.images) && results.images.length > 0) {
        // v1 format: results.images[0]
        return results.images[0]
      }

      throw new Error('No results in successful response or unknown format')
    }


    if (status === 'FAILED' || status === 'failed') {
      throw new Error(`Task failed on RunningHub: ${taskData?.error || 'Unknown error'}`)
    }

    console.log(`   Task ${taskId} status: ${status} (attempt ${attempt + 1})`)
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  throw new Error('Task polling timeout')
}

/**
 * Downloads an image from a URL and converts it to base64
 */
const downloadAsBase64 = async (url: string): Promise<string> => {
  const response = await axios.get(url, { responseType: 'arraybuffer' })
  const base64 = Buffer.from(response.data, 'binary').toString('base64')
  const contentType = response.headers['content-type'] || 'image/png'
  return `data:${contentType};base64,${base64}`
}

router.post('/edit', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageBase64, prompt, maskBase64, aspectRatio, resolution } = req.body as EditRequestBody

    if (!imageBase64 || !prompt) {
      res.status(400).json({ 
        error: 'Missing required fields: imageBase64 and prompt are required' 
      })
      return
    }

    console.log('--- Starting AI Edit Process ---')
    console.log(`   Aspect Ratio: ${aspectRatio || 'auto'}`)
    console.log(`   Resolution: ${resolution || '1k'}`)
    
    console.log('1. Creating task...')
    const taskId = await createTask(imageBase64, prompt, maskBase64, aspectRatio, resolution)
    console.log('   Task created:', taskId)
    
    console.log('2. Polling for results...')
    const resultImageUrl = await pollTaskStatus(taskId)
    console.log('   Result URL received:', resultImageUrl)

    console.log('3. Converting result to base64...')
    const resultImageBase64 = await downloadAsBase64(resultImageUrl)
    console.log('   Conversion complete.')

    const response: EditResponseBody = {
      resultImageBase64,
      provider: 'runninghub',
      cost: 0
    }

    res.json(response)
  } catch (error) {
    console.error('Edit error:', error)
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        res.status(502).json({ 
          error: 'External API error',
          details: error.response.data
        })
        return
      }
    }

    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

export default router

