const fs = require('fs')
const path = require('path')

// List of admin pages that need fixing
const adminPages = [
  'src/app/admin/settings/page.tsx',
  'src/app/admin/searches/images/page.tsx',
  'src/app/admin/searches/failed/page.tsx',
  'src/app/admin/searches/page.tsx',
  'src/app/admin/subscriptions/page.tsx',
  'src/app/admin/logs/page.tsx',
  'src/app/admin/users/page.tsx'
]

// Patterns specific to admin pages
const adminReplacements = [
  // Fix useAuth import
  {
    from: /const { user, loading: authLoading\s+} = useAuth\(\)/g,
    to: 'const { user, loading: authLoading, apiRequest } = useAuth()'
  },
  // Fix auth check in useEffect
  {
    from: /if \(!authLoading && user\) return/g,
    to: 'if (authLoading) return'
  },
  // Fix admin check
  {
    from: /if \(!session \|\| !\(session\.user as any\)\.isAdmin\) \{/g,
    to: 'if (!user || !(user as any).isAdmin) {'
  },
  // Fix useEffect dependencies
  {
    from: /}, \[session, status, router/g,
    to: '}, [user, authLoading, router'
  },
  // Fix loading conditions
  {
    from: /if \(!authLoading && user \|\| loading\) \{/g,
    to: 'if (authLoading || loading) {'
  },
  // Fix final admin check
  {
    from: /if \(!session \|\| !\(session\.user as any\)\.isAdmin\) \{(\s+return null\s+)/g,
    to: 'if (!user || !(user as any).isAdmin) {$1'
  },
  // Fix fetch calls
  {
    from: /const response = await fetch\(/g,
    to: 'const response = await apiRequest('
  },
  // Fix undefined status and session variables
  {
    from: /}, \[.*session.*status.*router.*\]/g,
    to: '}, [user, authLoading, router]'
  }
]

console.log('Starting admin pages fixes...')

adminPages.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath)
  
  try {
    if (fs.existsSync(fullPath)) {
      console.log(`Processing: ${filePath}`)
      let content = fs.readFileSync(fullPath, 'utf8')
      
      // Apply all replacements
      adminReplacements.forEach(replacement => {
        const beforeReplace = content
        content = content.replace(replacement.from, replacement.to)
        if (beforeReplace !== content) {
          console.log(`  ✓ Applied replacement: ${replacement.from}`)
        }
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

console.log('Admin pages fixes completed!')