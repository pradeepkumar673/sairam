import { scanDoctorSlipHF } from "./src/helpers/hf.helper";
import "dotenv/config";

(async () => {
    try {
        console.log("Testing scanDoctorSlipHF...");
        // Provide a minimalist valid base64 PNG dummy
        const dummyBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
        const result = await scanDoctorSlipHF(dummyBase64);
        console.log("Success:", result);
    } catch(err: any) {
        console.error("HF failed:", err.response?.data || err.message);
    }
})();
