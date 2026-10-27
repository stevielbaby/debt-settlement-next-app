DELETE FROM app.organization_subscriptions
WHERE plan_id = 'plan_pro';

DELETE FROM app.subscription_plans
WHERE id = 'plan_pro';
