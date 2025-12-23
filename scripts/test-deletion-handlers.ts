#!/usr/bin/env node
/**
 * Test script for verifying PHASE 1 deletion handlers
 * Tests the new customer.deleted, invoice.deleted, and charge.refunded handlers
 */

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      error: error.message,
      details: error.stack,
    });
    console.log(`✗ ${name}: ${error.message}`);
  }
}

async function runTests() {
  console.log("\n📋 PHASE 1 Deletion Handler Tests\n");
  console.log("═".repeat(60));

  // Test 1: Verify customer.deleted handler exists
  await test("Webhook handler includes customer.deleted case", async () => {
    const fs = require("fs");
    const content = fs.readFileSync(
      "./app/api/webhooks/stripe/route.ts",
      "utf-8"
    );
    if (!content.includes('case "customer.deleted":')) {
      throw new Error('customer.deleted handler not found');
    }
    if (!content.includes("Update organization_subscriptions")) {
      throw new Error("customer.deleted handler missing subscription cleanup");
    }
  });

  // Test 2: Verify invoice.deleted handler exists
  await test("Webhook handler includes invoice.deleted case", async () => {
    const fs = require("fs");
    const content = fs.readFileSync(
      "./app/api/webhooks/stripe/route.ts",
      "utf-8"
    );
    if (!content.includes('case "invoice.deleted":')) {
      throw new Error('invoice.deleted handler not found');
    }
    if (!content.includes("DELETE FROM app.invoices")) {
      throw new Error("invoice.deleted handler missing invoice deletion");
    }
  });

  // Test 3: Verify charge.refunded handler exists
  await test("Webhook handler includes charge.refunded case", async () => {
    const fs = require("fs");
    const content = fs.readFileSync(
      "./app/api/webhooks/stripe/route.ts",
      "utf-8"
    );
    if (!content.includes('case "charge.refunded":')) {
      throw new Error('charge.refunded handler not found');
    }
    if (!content.includes("logBillingEvent")) {
      throw new Error("charge.refunded handler missing event logging");
    }
  });

  // Test 4: Verify idempotency fix (mark processed AFTER, not before)
  await test("Webhook idempotency fixed - mark processed after handler", async () => {
    const fs = require("fs");
    const content = fs.readFileSync(
      "./app/api/webhooks/stripe/route.ts",
      "utf-8"
    );

    // Check that we don't mark as processed before the switch statement
    const lines = content.split("\n");
    let markProcessedLine = -1;
    let switchLine = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('case "payment_intent.payment_failed":')) {
        switchLine = i;
      }
      if (
        lines[i].includes("await markWebhookProcessed") &&
        lines[i].includes("eventProcessed = true")
      ) {
        markProcessedLine = i;
      }
    }

    if (markProcessedLine < switchLine) {
      throw new Error(
        "markWebhookProcessed is called before switch statement - should be after"
      );
    }

    if (!content.includes("eventProcessed = false")) {
      throw new Error("eventProcessed flag not initialized before processing");
    }

    if (!content.includes("eventProcessed = true")) {
      throw new Error("eventProcessed flag not set after processing");
    }
  });

  // Test 5: Verify Stripe subscriptions list is called for deleted customers
  await test(
    "customer.deleted handler calls stripe.subscriptions.list",
    async () => {
      const fs = require("fs");
      const content = fs.readFileSync(
        "./app/api/webhooks/stripe/route.ts",
        "utf-8"
      );

      if (!content.includes("stripe.subscriptions.list")) {
        throw new Error(
          "customer.deleted handler should call stripe.subscriptions.list"
        );
      }

      if (!content.includes('status: "all"')) {
        throw new Error(
          "stripe.subscriptions.list should request all statuses"
        );
      }
    }
  );

  // Test 6: Verify customer ID cleared from database
  await test(
    "customer.deleted handler clears stripe_customer_id from organizations",
    async () => {
      const fs = require("fs");
      const content = fs.readFileSync(
        "./app/api/webhooks/stripe/route.ts",
        "utf-8"
      );

      if (!content.includes("stripe_customer_id = NULL")) {
        throw new Error(
          "customer.deleted handler should clear stripe_customer_id"
        );
      }
    }
  );

  // Test 7: Verify subscriptions are canceled in Stripe before DB
  await test(
    "customer.deleted handler cancels subscriptions in Stripe first",
    async () => {
      const fs = require("fs");
      const content = fs.readFileSync(
        "./app/api/webhooks/stripe/route.ts",
        "utf-8"
      );

      const customerDeletedSection = content.substring(
        content.indexOf('case "customer.deleted":'),
        content.indexOf("case:")
      );

      if (!customerDeletedSection.includes("stripe.subscriptions.cancel")) {
        throw new Error(
          "customer.deleted handler should cancel subscriptions in Stripe"
        );
      }
    }
  );

  console.log("\n" + "═".repeat(60));
  console.log("\n📊 Test Summary\n");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed} ✓`);
  console.log(`Failed: ${failed} ✗`);

  if (failed > 0) {
    console.log("\n❌ Failed Tests:\n");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  • ${r.name}`);
        console.log(`    Error: ${r.error}`);
      });
  } else {
    console.log("\n✅ All tests passed!");
  }

  console.log("\n" + "═".repeat(60) + "\n");

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((error) => {
  console.error("Test runner error:", error);
  process.exit(1);
});
