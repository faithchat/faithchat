import express from "express";
import "dotenv/config";
import { Client, Environment, SubscriptionsController } from "@paypal/paypal-server-sdk";
import bodyParser from "body-parser";
import cors from "cors";

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

const subscriptionsController = new SubscriptionsController(client);

async function createSubscriptionPlans() {
    const monthlyPlan = {
        body: {
            name: "FaithChat AI Monthly Subscription",
            description: "Monthly subscription for FaithChat AI",
            status: "ACTIVE",
            billing_cycles: [
                {
                    frequency: { interval_unit: "MONTH", interval_count: 1 },
                    tenure_type: "REGULAR",
                    sequence: 1,
                    total_cycles: 0,
                    pricing_scheme: { fixed_price: { value: "19.99", currency_code: "USD" } }
                }
            ],
            payment_preferences: {
                auto_bill_outstanding: true,
                payment_failure_threshold: 3
            },
            taxes: { percentage: "0", inclusive: false }
        }
    };

    const yearlyPlan = {
        body: {
            name: "FaithChat AI Yearly Subscription",
            description: "Yearly subscription for FaithChat AI",
            status: "ACTIVE",
            billing_cycles: [
                {
                    frequency: { interval_unit: "YEAR", interval_count: 1 },
                    tenure_type: "REGULAR",
                    sequence: 1,
                    total_cycles: 0,
                    pricing_scheme: { fixed_price: { value: "191.88", currency_code: "USD" } }
                }
            ],
            payment_preferences: {
                auto_bill_outstanding: true,
                payment_failure_threshold: 3
            },
            taxes: { percentage: "0", inclusive: false }
        }
    };

    try {
        const productResponse = await subscriptionsController.createProduct({
            body: {
                name: "FaithChat AI",
                description: "AI-powered Bible study tool",
                type: "SERVICE"
            }
        });
        const productId = productResponse.result.id;
        monthlyPlan.body.product_id = productId;
        yearlyPlan.body.product_id = productId;

        const monthlyPlanResponse = await subscriptionsController.createPlan(monthlyPlan);
        console.log("Monthly Plan ID:", monthlyPlanResponse.result.id);

        const yearlyPlanResponse = await subscriptionsController.createPlan(yearlyPlan);
        console.log("Yearly Plan ID:", yearlyPlanResponse.result.id);

        return {
            monthlyPlanId: monthlyPlanResponse.result.id,
            yearlyPlanId: yearlyPlanResponse.result.id
        };
    } catch (error) {
        console.error("Error creating plans:", error);
        throw error;
    }
}

// Run this manually to create plans and store the IDs
// createSubscriptionPlans().then(plans => console.log(plans));

app.post("/api/subscriptions", async (req, res) => {
    try {
        const { subscriptionId, plan } = req.body;
        console.log("Subscription created:", { subscriptionId, plan });
        res.status(200).json({ status: "success", subscriptionId });
    } catch (error) {
        console.error("Error storing subscription:", error);
        res.status(500).json({ error: "Failed to store subscription." });
    }
});

app.listen(PORT, () => {
    console.log(`Node server listening at http://monday-modules.gl.at.ply.gg:${PORT}/`);
});
