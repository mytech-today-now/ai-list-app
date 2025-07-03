import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test setup...')
  
  // Launch browser for setup
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    // Wait for services to be ready
    console.log('⏳ Waiting for backend service...')
    await page.goto('http://localhost:3001/health', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    })
    
    console.log('⏳ Waiting for frontend service...')
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    })
    
    // Setup test data if needed
    console.log('📊 Setting up test data...')
    
    // Create test user/session if authentication is implemented
    // await setupTestUser(page)
    
    console.log('✅ E2E test setup completed')
    
  } catch (error) {
    console.error('❌ E2E test setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }
}

export default globalSetup
