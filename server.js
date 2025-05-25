import express from "express";
import "dotenv/config";
import { Client, Environment, VaultController, ApiError } from "@paypal/paypal-server-sdk";
import bodyParser from "body-parser";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

const {
    PAYPAL_CLIENT_ID = "AVPO3FzIYpZHUBmh25OqjImDM3y-pGKeHmeJGsNiKr3kKatEO8Rb1xJR9WO31Vk-9-vUleW-JqgUUxXA",
    PAYPAL_CLIENT_SECRET = "EKaeZOk706O8gEUNGv6dn2IFxbXoftfUQy95b4LaArV7ueEYBznEbnK_SD84-zSlWA5Zz2MIu3dtf-57",
    PORT = 62761,
} = process.env;

const client = new Client({
    clientCredentialsAuthCredentials: {
        oAuthClientId: PAYPAL_CLIENT_ID,
        oAuthClientSecret: PAYPAL_CLIENT_SECRET,
    },
    environment: Environment.Live, // Change to Environment.Sandbox for testing
});

const vaultController = new VaultController(client);

async function createVaultSetupToken(req) {
    const collect = {
        paypalRequestId: uuidv4(),
        body: req.body,
    };
    try {
        const { result } = await vaultController.setupTokensCreate(collect);
        return {
            id: result.id,
            status: result.status,
        };
    } catch (error) {
        if (error instanceof ApiError) {
            throw new Error(JSON.stringify(error.result || error.message));
        }
        throw error;
    }
}

async function createPaymentToken(req) {
    const collect = {
        paypalRequestId: uuidv4(),
        body: req.body,
    };
    try {
        const { result } = await vaultController.paymentTokensCreate(collect);
        return {
            id: result.id,
            status: result.status,
        };
    } catch (error) {
        if (error instanceof ApiError) {
            throw new Error(JSON.stringify(error.result || error.message));
        }
        throw error;
    }
}

app.post("/api/vault", async (req, res) => {
    try {
        const setupToken = await createVaultSetupToken(req);
        res.status(200).json(setupToken);
    } catch (error) {
        console.error("Failed to create setup token:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/vault/payment-tokens", async (req, res) => {
    try {
        const paymentToken = await createPaymentToken(req);
        res.status(200).json(paymentToken);
    } catch (error) {
        console.error("Failed to create payment token:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/subscriptions", async (req, res) => {
    try {
        const { paymentTokenId, plan } = req.body;
        console.log("Subscription created:", { paymentTokenId, plan });
        // Store paymentTokenId and plan in your database
        res.status(200).json({ status: "success", paymentTokenId });
    } catch (error) {
        console.error("Error storing subscription:", error.message);
        res.status(500).json({ error: "Failed to store subscription." });
    }
});

app.listen(PORT, () => {
    console.log(`Node server listening at http://monday-modules.gl.at.ply.gg:${PORT}/`);
    console.log(`Access payment page at http://monday-modules.gl.at.ply.gg:${PORT}/payment.html`);
});
