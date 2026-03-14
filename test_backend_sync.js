const axios = require('axios');

const backendUrl = 'https://planora-bot-production.up.railway.app';
const userId = '5329519026';

async function testBackend() {
    console.log(`Testing backend at: ${backendUrl}/tasks/user/${userId}`);
    try {
        const response = await axios.get(`${backendUrl}/tasks/user/${userId}`);
        console.log('Status Code:', response.status);
        console.log('Response Header:', response.headers['content-type']);
        console.log('Response Body:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error connecting to backend:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Message:', error.message);
        }
    }
}

testBackend();
