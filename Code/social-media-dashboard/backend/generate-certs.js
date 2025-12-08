/**
 * Generate self-signed certificates for TLS/HTTPS
 * Creates a Certificate Authority (CA) and server certificate
 * Run: node generate-certs.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Simple self-signed certificate generator
const { spawn } = require('child_process');

const certsDir = path.join(__dirname, 'certs');

// Create certs directory if it doesn't exist
if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
}

console.log('Generating self-signed certificates for TLS...');

// Check if certificates already exist
const keyPath = path.join(certsDir, 'server.key');
const certPath = path.join(certsDir, 'server.crt');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('Certificates already exist at:');
    console.log(`  Key: ${keyPath}`);
    console.log(`  Cert: ${certPath}`);
    process.exit(0);
}

// Generate using openssl command
const openssl = spawn('openssl', [
    'req',
    '-x509',
    '-newkey', 'rsa:2048',
    '-keyout', keyPath,
    '-out', certPath,
    '-days', '365',
    '-nodes',
    '-subj', '/C=DE/ST=BadenWuerttemberg/L=Stuttgart/O=4N IT-Solutions/CN=localhost'
]);

let output = '';
let error = '';

openssl.stdout.on('data', (data) => {
    output += data.toString();
});

openssl.stderr.on('data', (data) => {
    error += data.toString();
});

openssl.on('close', (code) => {
    if (code === 0) {
        console.log('✓ Certificates generated successfully!');
        console.log(`  Private Key: ${keyPath}`);
        console.log(`  Certificate: ${certPath}`);
        console.log('\nCertificate Details:');
        console.log('  - Valid for 365 days');
        console.log('  - Self-signed');
        console.log('  - CN: localhost');
        console.log('\nTo use in development:');
        console.log('  - Set TLS_CERT_PATH=./certs/server.crt');
        console.log('  - Set TLS_KEY_PATH=./certs/server.key');
        console.log('  - Set TLS_ENABLED=true');
    } else {
        console.error('Failed to generate certificates');
        if (error) console.error('Error:', error);
        if (output) console.error('Output:', output);
        process.exit(1);
    }
});
