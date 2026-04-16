import axios from "axios";
import "dotenv/config";

async function testGroq() {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("No GROQ KEY");
    try {
        const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
            model: "llama-3.2-11b-vision-instruct",
            messages: [{
                role: "user",
                content: [
                    { type: "text", text: "Return the word 'dog' as json {\"animal\":\"dog\"} from this image" },
                    { type: "image_url", image_url: { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" } }
                ]
            }],
            response_format: { type: "json_object" }
        }, { headers: { Authorization: `Bearer ${key}` }});
        console.log("Success:", JSON.stringify(res.data.choices[0].message.content));
    } catch(err: any) {
        console.error("Groq error:", err.response?.data || err.message);
    }
}
testGroq();
