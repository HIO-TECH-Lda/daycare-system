#!/usr/bin/env node

/**
 * Environment Setup Script
 * Helps users configure their .env file for the Daycare API
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envExamplePath = path.join(__dirname, '..', 'env.example');
const envPath = path.join(__dirname, '..', '.env');

console.log('🚀 Daycare API - Environment Setup');
console.log('============================================\n');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists!');
  rl.question('Do you want to overwrite it? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      setupEnvironment();
    } else {
      console.log('Setup cancelled.');
      rl.close();
    }
  });
} else {
  setupEnvironment();
}

function setupEnvironment() {
  console.log('\n📝 Setting up environment variables...\n');

  // Read the example file
  const envExample = fs.readFileSync(envExamplePath, 'utf8');
  let envContent = envExample;

  // Define required variables and their prompts
  const requiredVars = [
    {
      key: 'MONGODB_URI',
      prompt: 'Enter your MongoDB Atlas connection string:',
      description: 'Format: mongodb+srv://username:password@cluster.mongodb.net/database'
    },
    {
      key: 'JWT_SECRET',
      prompt: 'Enter a strong JWT secret key (or press Enter to generate one):',
      description: 'Used for signing JWT tokens'
    }
  ];

  // Define optional variables with prompts
  const optionalVars = [
    {
      key: 'STRIPE_SECRET_KEY',
      prompt: 'Enter your Stripe secret key (optional):',
      description: 'For payment processing'
    },
    {
      key: 'STRIPE_PUBLISHABLE_KEY',
      prompt: 'Enter your Stripe publishable key (optional):',
      description: 'For frontend integration'
    },
    {
      key: 'STRIPE_WEBHOOK_SECRET',
      prompt: 'Enter your Stripe webhook secret (optional):',
      description: 'For payment verification'
    },
    {
      key: 'SMTP_USER',
      prompt: 'Enter your SMTP email (optional):',
      description: 'For sending emails'
    },
    {
      key: 'SMTP_PASS',
      prompt: 'Enter your SMTP password (optional):',
      description: 'For sending emails'
    },
    {
      key: 'CLOUDINARY_CLOUD_NAME',
      prompt: 'Enter your Cloudinary cloud name (optional):',
      description: 'For file uploads'
    },
    {
      key: 'CLOUDINARY_API_KEY',
      prompt: 'Enter your Cloudinary API key (optional):',
      description: 'For file uploads'
    },
    {
      key: 'CLOUDINARY_API_SECRET',
      prompt: 'Enter your Cloudinary API secret (optional):',
      description: 'For file uploads'
    }
  ];

  let currentIndex = 0;
  const allVars = [...requiredVars, ...optionalVars];

  function askNextQuestion() {
    if (currentIndex >= allVars.length) {
      finishSetup();
      return;
    }

    const currentVar = allVars[currentIndex];
    
    console.log(`\n${currentVar.description}`);
    rl.question(currentVar.prompt, (answer) => {
      if (answer.trim()) {
        // Replace the placeholder in the env content
        const regex = new RegExp(`^${currentVar.key}=.*$`, 'm');
        const replacement = `${currentVar.key}=${answer.trim()}`;
        
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, replacement);
        } else {
          // Add the variable if it doesn't exist
          envContent += `\n${replacement}`;
        }
      }
      
      currentIndex++;
      askNextQuestion();
    });
  }

  function finishSetup() {
    // Generate JWT secret if not provided
    if (!envContent.includes('JWT_SECRET=') || envContent.includes('JWT_SECRET=your-super-secret-jwt-key')) {
      const jwtSecret = generateJWTSecret();
      envContent = envContent.replace(
        /^JWT_SECRET=.*$/m,
        `JWT_SECRET=${jwtSecret}`
      );
      console.log('\n✅ Generated JWT secret key');
    }

    // Write the .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log('\n✅ Environment setup completed!');
    console.log('📁 .env file created successfully');
    console.log('\n🔧 Next steps:');
    console.log('1. Review your .env file and update any values if needed');
    console.log('2. Run "npm run dev" to start the development server');
    console.log('3. Visit http://localhost:3002/health to verify the server is running');
    console.log('\n⚠️  Remember: Never commit your .env file to version control!');
    
    rl.close();
  }

  // Start asking questions
  askNextQuestion();
}

function generateJWTSecret() {
  const crypto = require('crypto');
  return crypto.randomBytes(64).toString('hex');
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log('\n\n❌ Setup cancelled.');
  rl.close();
  process.exit(0);
});
