import { scanDoctorSlipGemini } from "./src/helpers/gemini.helper";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

(async () => {
    try {
        console.log("Testing scanDoctorSlipGemini...");
        const imagePath = path.resolve("./package.json"); // Just to get a string or throw
        // Instead of real image, let's just make a dummy base64 1x1 png to see if model accepts it
        const dummyBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
        const result = await scanDoctorSlipGemini(dummyBase64, "image/png");
        console.log("Success:", result);
    } catch(err: any) {
        console.error("Gemini failed:", err.message);
    }
})();
