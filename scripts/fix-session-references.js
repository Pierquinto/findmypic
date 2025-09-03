const fs = require('fs')
const path = require('path')

// List of files that need fixing
const filesToFix = [
  'src/app/api/user/search-history/route.ts',
  'src/app/api/user/data-removal/route.ts',
  'src/app/api/user/protected-assets/route.ts',
  'src/app/api/user/protected-assets/[id]/route.ts',
  'src/app/api/user/protected-assets/[id]/check/route.ts',
  'src/app/api/custom-search-request/route.ts',
  'src/app/api/search-images/[id]/route.ts',
  'src/app/api/proxy-search-image/[id]/route.ts',
  'src/app/api/violations/[id]/route.ts'
]

// Common patterns to replace
const replacements = [
  // Fix requireAuth parameter
  {
    from: /const user = await requireAuth\(request\)/g,
    to: 'const user = await requireAuth(req)'
  },
  // Fix session check
  {
    from: /if \(!session\) \{/g,
    to: 'if (!user?.id) {'
  },
  // Fix userId extraction
  {
    from: /const userId = \(session\.user as any\)\.id/g,
    to: 'const userId = user.id'
  },
  // Fix admin check
  {
    from: /if \(!session \|\| !\(session\.user as any\)\.isAdmin\) \{/g,
    to: 'if (!user || !(user as any).isAdmin) {'
  },
  // Fix user email references
  {
    from: /session\.user\.email/g,
    to: 'user.email'
  },
  // Fix other session.user references
  {
    from: /\(session\.user as any\)\.id/g,
    to: 'user.id'
  },
  // Fix function signatures that are missing request parameter
  {
    from: /export async function (GET|POST|PUT|DELETE)\(\) \{/g,
    to: 'export async function $1(req: NextRequest) {'
  }
]

console.log('Starting session.user reference fixes...')

filesToFix.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath)
  
  try {
    if (fs.existsSync(fullPath)) {
      console.log(`Processing: ${filePath}`)
      let content = fs.readFileSync(fullPath, 'utf8')
      
      // Apply all replacements
      replacements.forEach(replacement => {
        content = content.replace(replacement.from, replacement.to)
      })
      
      // Write back the fixed content
      fs.writeFileSync(fullPath, content, 'utf8')
      console.log(`✓ Fixed: ${filePath}`)
    } else {
      console.log(`⚠ File not found: ${filePath}`)
    }
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message)
  }
})

console.log('Session.user reference fixes completed!')