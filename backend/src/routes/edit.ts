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
}

interface EditResponseBody {
  resultImageBase64: string
  provider: string
  cost: number
}

const RUNNINGHUB_API_KEY = process.env.RUNNINGHUB_API_KEY || ''
const RUNNINGHUB_BASE_URL = process.env.RUNNINGHUB_BASE_URL || 'https://www.runninghub.ai'
const RUNNINGHUB_ENDPOINT = process.env.RUNNINGHUB_ENDPOINT || '/openapi/v2/rhart-image-n-pro/edit'
const RUNNINGHUB_WORKFLOW_ID = process.env.RUNNINGHUB_WORKFLOW_ID || ''

const MAX_POLL_ATTEMPTS = 60
const POLL_INTERVAL_MS = 2000

/**
 * Creates a task on RunningHub using direct Base64 images
 */
const createTask = async (imageBase64: string, prompt: string, maskBase64?: string): Promise<string> => {
  const url = `${RUNNINGHUB_BASE_URL}${RUNNINGHUB_ENDPOINT}`
  
  // Ensure we have correct data URI format (RunningHub might need the header for decoding)
  const formatBase64 = (b64: string) => b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`

  const imageUrls = [formatBase64(imageBase64)]
  if (maskBase64) {
    imageUrls.push(formatBase64(maskBase64))
  }

  const payload: any = {
    workflowId: RUNNINGHUB_WORKFLOW_ID,
    prompt: prompt,
    imageUrls: imageUrls,
    aspectRatio: '1:1',
    resolution: '1k'
  }

  const response = await axios.post(url, payload, {
    headers: {
      'Authorization': `Bearer ${RUNNINGHUB_API_KEY}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  })

  // Log raw response for debugging if it's not a success code 0
  const code = response.data.code ?? response.data.errorCode
  const msg = response.data.msg ?? response.data.message ?? response.data.errorMessage

  if (code !== 0 && code !== undefined) {
    console.log('RunningHub Raw Error Response:', JSON.stringify(response.data, null, 2))
    throw new Error(`RunningHub API error (${code}): ${msg || 'No message provided'}`)
  }

  const taskId = response.data.data?.taskId ?? response.data.taskId
  if (!taskId) {
    console.log('RunningHub Missing TaskId Response:', JSON.stringify(response.data, null, 2))
    throw new Error('No taskId returned from RunningHub API')
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

    if (code !== 0 && code !== undefined) {
      throw new Error(`RunningHub status error (${code}): ${msg || 'No message provided'}`)
    }

    const taskData = response.data.data ?? response.data
    const status = taskData?.status


    if (status === 'SUCCESS' || status === 'success') {
      const results = taskData?.results
      if (!results || !results.images || results.images.length === 0) {
        throw new Error('No results in successful response')
      }
      // Return the first image URL from results.images
      return results.images[0]
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
    const { imageBase64, prompt, maskBase64 } = req.body as EditRequestBody

    if (!imageBase64 || !prompt) {
      res.status(400).json({ 
        error: 'Missing required fields: imageBase64 and prompt are required' 
      })
      return
    }

    console.log('--- Starting AI Edit Process ---')
    
    console.log('1. Creating task...')
    const taskId = await createTask(imageBase64, prompt, maskBase64)
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

