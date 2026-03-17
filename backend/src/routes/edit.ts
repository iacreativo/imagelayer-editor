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
 * Uploads a base64 image to RunningHub to get a public URL
 */
const uploadFile = async (base64Data: string): Promise<string> => {
  const url = `${RUNNINGHUB_BASE_URL}/openapi/v2/file/upload`
  
  // Remove data:image/...;base64, prefix if present
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

  if (response.data.code !== 0) {
    throw new Error(`RunningHub Upload error: ${response.data.msg}`)
  }

  return response.data.data.url
}

const createTask = async (imageUrl: string, prompt: string, maskUrl?: string): Promise<string> => {
  const url = `${RUNNINGHUB_BASE_URL}${RUNNINGHUB_ENDPOINT}`
  
  const payload: any = {
    workflowId: RUNNINGHUB_WORKFLOW_ID,
    prompt: prompt,
    imageUrls: [imageUrl],
    aspectRatio: '1:1',
    resolution: '1k'
  }

  // If there's a mask, some engines might need it as a second image or a specific field
  // For NanoBanana Pro, we might just include it in imageUrls if the prompt handles it,
  // but usually it's better to check documentation. For now, we follow the primary image.

  const response = await axios.post(url, payload, {
    headers: {
      'Authorization': `Bearer ${RUNNINGHUB_API_KEY}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  })

  if (response.data.code !== 0) {
    throw new Error(`RunningHub API error: ${response.data.msg}`)
  }

  if (!response.data.data?.taskId) {
    throw new Error('No taskId returned from RunningHub API')
  }

  return response.data.data.taskId
}

const pollTaskStatus = async (taskId: string): Promise<string> => {
  const url = `${RUNNINGHUB_BASE_URL}/openapi/v2/task/result`
  
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await axios.get(url, {
      params: { taskId },
      headers: { 'Authorization': `Bearer ${RUNNINGHUB_API_KEY}` },
      timeout: 10000
    })

    if (response.data.code !== 0) {
      throw new Error(`RunningHub status error: ${response.data.msg}`)
    }

    const taskData = response.data.data
    const status = taskData?.status

    if (status === 'SUCCESS' || status === 'success') {
      const results = taskData?.results
      if (!results || results.length === 0) {
        throw new Error('No results in successful response')
      }
      // Return the first image URL
      return results[0].url
    }

    if (status === 'FAILED' || status === 'failed') {
      throw new Error(`Task failed on RunningHub: ${taskData?.error || 'Unknown error'}`)
    }

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
    console.log('1. Uploading base image...')
    const imageUrl = await uploadFile(imageBase64)
    console.log('   Image uploaded:', imageUrl)

    let maskUrl = undefined
    if (maskBase64) {
      console.log('2. Uploading mask...')
      maskUrl = await uploadFile(maskBase64)
      console.log('   Mask uploaded:', maskUrl)
    }

    console.log('3. Creating task...')
    const taskId = await createTask(imageUrl, prompt, maskUrl)
    console.log('   Task created:', taskId)
    
    console.log('4. Polling for results...')
    const resultImageUrl = await pollTaskStatus(taskId)
    console.log('   Result URL received:', resultImageUrl)

    console.log('5. Converting result to base64...')
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
