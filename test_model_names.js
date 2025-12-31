
const fetch = require('node-fetch');
async function test() {
    const key = 'AIzaSyDdPj6NTkUECaVGMTny8qZi4ZfBR9y05dc';
    const models = [
        'gemini-2.0-flash-thinking-exp-1219',
        'gemini-2.0-flash-thinking-exp',
        'gemini-2.0-flash-thinking-1219',
        'gemini-2.0-flash-thinking-exp-12-19'
    ];

    for (const model of models) {
        console.log(`Testing model: ${model}`);
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'say hi' }] }]
                })
            }
        );
        console.log(`Status: ${response.status} ${response.statusText}`);
        if (response.ok) {
            console.log('✅ Found!');
            return;
        }
    }
}
test();
