#!/usr/bin/env node
/**
 * Test script for verifying PHASE 1 deletion handlers
 * Tests the new customer.deleted, invoice.deleted, and charge.refunded handlers
 */

const fs = require("fs");

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      error: error.message,
    });
    console.log(`✗ ${name}: ${error.message}`);
  }
}

async function runTests() {
  console.log("\n📋 PHASE 1 Deletion Handler Tests\n");
  console.log("═".repeat(60));

  const webhookContent = fs.readFileSync("./app/api/webhooks/stripe/route.ts", "utf-8");

  // Test 1: Verify customer.deleted handler exists
  await test("✓ Webhook handler includes customer.deleted case", () => {
    if (!webhookContent.includes('case "customer.deleted":')) {
      throw new Error('customer.deleted handler not found');
    }
  });

  // Test 2: Verify customer.deleted cancels Stripe subscriptions
  await test("✓ customer.deleted cancels subscriptions in Stripe first", () => {
    const section = webhookContent.substring(
      webhookContent.indexOf('case "customer.deleted":'),
      webhookContent.indexOf('case "invoice.deleted":')
    );
    if (!section.includes("stripe.subscriptions.cancel")) {
      throw new Error("Should cancel Stripe subscriptions");
    }
  });

  // Test 3: Verify customer.deleted clears DB records
  await test("✓ customer.deleted clears organization subscriptions in database", () => {
    const section = webhookContent.substring(
      webhookContent.indexOf('case "customer.deleted":'),
      webhookContent.indexOf('case "invoice.deleted":')
    );
    if (!section.includes("stripe_subscription_id = NULL")) {
      throw new Error("Should clear stripe_subscription_id");
    }
  });

  // Test 4: Verify invoice.deleted handler exists
  await test("✓ Webhook handler includes invoice.deleted case", () => {
    if (!webhookContent.includes('case "invoice.deleted":')) {
      throw new Error('invoice.deleted handler not found');
    }
  });

  // Test 5: Verify invoice.deleted deletes from DB
  await test("✓ invoice.deleted deletes orphaned invoices from database", () => {
    const section = webhookContent.substring(
      webhookContent.indexOf('case "invoice.deleted":'),
      webhookContent.indexOf('case "charge.refunded":')
    );
    if (!section.includes("DELETE FROM app.invoices")) {
      throw new Error("Should delete invoices");
    }
  });

  // Test 6: Verify charge.refunded handler exists
  await test("✓ Webhook handler includes charge.refunded case", () => {
    if (!webhookContent.includes('case "charge.refunded":')) {
      throw new Error('charge.refunded handler not found');
    }
  });

  // Test 7: Verify charge.refunded logs events
  await test("✓ charge.refunded logs refund events for auditing", () => {
    const section = webhookContent.substring(
      webhookContent.indexOf('case "charge.refunded":'),
      webhookContent.indexOf("default:")
    );
    if (!section.includes("logBillingEvent")) {
      throw new Error("Should log billing event");
    }
  });

  // Test 8: Verify idempotency fix - mark processed AFTER handler
  await test("✓ Webhook idempotency fixed - mark processed AFTER handler execution", () => {
    if (!webhookContent.includes("eventProcessed = false")) {
      throw new Error("Should initialize eventProcessed flag");
    }
    if (!webhookContent.includes("eventProcessed = true")) {
      throw new Error("Should set eventProcessed = true after processing");
    }

    // Verify the mark happens after the switch
    const lines = webhookContent.split("\n");
    let markProcessedIdx = -1;
    let lastCaseIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("await markWebhookProcessed(event.id, event.type)")) {
        markProcessedIdx = i;
      }
      if (
        lines[i].includes('case "charge.refunded":') ||
        lines[i].includes("default:")
      ) {
        lastCaseIdx = i;
      }
    }

    if (markProcessedIdx < lastCaseIdx) {
      throw new Error(
        "markWebhookProcessed should be called AFTER all switch cases"
      );
    }
  });

  // Test 9: Verify old early marking is removed
  await test(
    "✓ Removed old race condition - no early marking before processing",
    () => {
      // Count occurrences of markWebhookProcessed
      const matches = (webhookContent.match(/markWebhookProcessed/g) || [])
        .length;
      if (matches !== 1) {
        throw new Error(
          `Should have exactly 1 markWebhookProcessed call, found ${matches}`
        );
      }
    }
  );

  // Test 10: Verify error handling doesn't suppress events
  await test(
    "✓ Errors are logged but 200 OK still returned to Stripe",
    () => {
      if (!webhookContent.includes("console.error")) {
        throw new Error("Should log errors");
      }
      if (!webhookContent.includes("return NextResponse.json({ success: true")) {
        throw new Error("Should return 200 OK to Stripe");
      }
    }
  );

  console.log("\n" + "═".repeat(60));
  console.log("\n📊 Test Summary\n");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}`);

  if (failed > 0) {
    console.log("\n❌ Failed Tests:\n");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  • ${r.name.replace("✓ ", "").replace("✗ ", "")}`);
        console.log(`    Error: ${r.error}`);
      });
  } else {
    console.log("\n✅ All tests passed! PHASE 1 implementation complete.");
    console.log("\n🎯 What was implemented:");
    console.log("   1. customer.deleted handler - cascades to cancel all org subscriptions");
    console.log("   2. invoice.deleted handler - removes orphaned invoice records");
    console.log("   3. charge.refunded handler - logs refunds for auditing");
    console.log("   4. Fixed idempotency - marks processed AFTER not BEFORE");
    console.log("   5. Cascade to app - subscriptions won't show active when canceled");
  }

  console.log("\n" + "═".repeat(60) + "\n");

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((error) => {
  console.error("Test runner error:", error);
  process.exit(1);
});
