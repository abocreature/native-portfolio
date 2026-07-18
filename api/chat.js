import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import https from 'https';

const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY
});

export default async function handler(req, res) {
    // Force header to close to avoid libuv crash
    res.setHeader('Connect', 'close');

    // Enforce cross-origin header configs for local testing
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).jsaon({ error: 'Method not allowed' });

    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'A valid messages array is required' });
        }

        // reads from root/projects-knowledge.md
        const filePath = path.join(process.cwd(), 'projects-knowledge.md');

        let markdownKnowledge = '';
        try {
            markdownKnowledge = fs.readFileSync(filePath, 'utf8');
        } catch (fsErr) {
            console.error('Failed to locate or read projects-knowledge.md:', fsErr);
            return res.status(500).json({ error: 'System knowledge base missing from server deployment' });
        }

        const systemInstruction = `
        You are a highly technical, professional AI chat assistant integrated into the portfolio page of a Full-Stack Software Engineer. 
        Your objective is to answer recruiter and developer inquiries concisely (under 3 sentences unless explicitly asked for technical details) based on the repository documentation provided below.
        If an engineering question falls outside of this scope, state that you only have context on the portfolio repositories.

        === REPOSITORY DATA ENTRY SOURCE LOG ===
        ${markdownKnowledge}
        === END REPOSITORY DATA ENTRY SOURCE LOG ===
        `;
        
        const formattedContents = messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        // 4. Serialize data payload into a raw JSON transmission block string
        const jsonPayload = JSON.stringify({
            contents: formattedContents,
            systemInstruction: {
                role: 'system',
                parts: [{ text: systemInstruction }]
            },
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1000
            }
        });

        const apiKey = process.env.GEMINI_API_KEY;
        
        // 5. Explicit structural definition targeting the raw Google Gemini HTTP Endpoints
        const networkOptions = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(jsonPayload),
                'Connection': 'close' // Forces the raw TCP connection pipeline closed on fulfillment
            }
        };

        // 6. Spawn the secure transport outbox request using Node's native network layer
        const outboundRequest = https.request(networkOptions, (incomingStream) => {
            const bodyChunks = [];
            
            incomingStream.on('data', (chunk) => { 
                bodyChunks.push(chunk); 
            });
            
            incomingStream.on('end', () => {
                try {
                    const completePayloadString = Buffer.concat(bodyChunks).toString('utf8');
                    const parsedPayload = JSON.parse(completePayloadString);

                    // Handle explicit errors surfaced from Google's schema layer
                    if (parsedPayload.error) {
                        console.error("Google Server Signaled API Exception:", parsedPayload.error);
                        return res.status(parsedPayload.error.code || 500).json({ error: parsedPayload.error.message });
                    }
                    
                    // Drill safely down through Google's JSON response matrix structure
                    const outputStringText = parsedPayload.candidates?.[0]?.content?.parts?.[0]?.text || 
                                            "I processed your inquiry but couldn't verify details in the repository notes.";
                    
                    // Return data to your React Native component frontend screen
                    return res.status(200).json({ response: outputStringText });
                } catch (parsingException) {
                    console.error("Failed to compile incoming streaming buffer data:", parsingException);
                    console.error("Raw response that failed parsing was:", analyticalBuffer.substring(0, 500));
                    return res.status(500).json({ error: "Invalid layout data returned from the core AI module." });
                }
            });
        });

        outboundRequest.on('error', (networkTransportError) => {
            console.error("Failed handling network request routing outbox stack:", networkTransportError);
            return res.status(500).json({ error: "System gateway communication failure." });
        });

        // 7. Write payload data buffer and explicitly drop the socket handle to kill memory leak loops
        outboundRequest.write(jsonPayload);
        outboundRequest.end();

    } catch (error) {
        console.error('Gemini API Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}