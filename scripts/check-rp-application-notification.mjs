import {
  getApplicationNotificationStatus,
  sendApplicationNotification,
} from "../lib/rpApplicationNotification.js";

const sendTest = process.argv.includes("--send-test");
const status = getApplicationNotificationStatus();

console.log("RePERFORMANCE application notification check");
console.log(`provider=${status.provider}`);
console.log(`endpointConfigured=${status.endpointConfigured}`);
console.log(`signed=${status.signed}`);
console.log(`configured=${status.configured}`);

if (!sendTest) {
  console.log("No message sent. Use the guarded test command only after reviewing the configured recipient.");
  process.exit(0);
}

if (process.env.RP_APPLICATION_NOTIFICATION_TEST_CONFIRM !== "SEND_ONE_MASKED_TEST") {
  throw new Error(
    "Set RP_APPLICATION_NOTIFICATION_TEST_CONFIRM=SEND_ONE_MASKED_TEST to authorize one masked test message.",
  );
}

if (!status.configured) {
  throw new Error("Application notification provider is not fully configured.");
}

const result = await sendApplicationNotification({
  id: `notification-test-${Date.now()}`,
  clientId: "notification-test-client",
  name: "테스트",
  selectedService: "notification-test",
  serviceLabel: "Gmail 알림 연동 테스트",
  consultationSlot: null,
});

if (!result.ok || result.skipped) {
  throw new Error(`Notification test was not delivered: ${result.reason || "unknown reason"}`);
}

console.log(`Masked test notification delivered through ${result.provider}.`);
