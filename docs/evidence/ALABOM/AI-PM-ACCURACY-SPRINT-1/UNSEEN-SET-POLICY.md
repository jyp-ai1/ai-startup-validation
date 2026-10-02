# Unseen business set — data separation (CPO lock)

| Set | IDs | Rule |
|-----|-----|------|
| **Development** | biz-01 … biz-10 | Fix iteration allowed; Expected/Actual used in RCA |
| **Regression** | biz-11 … biz-13 | Must stay green after every fix |
| **Unseen validation** | biz-14 … biz-15 | **Must not** drive Fix Cycle tuning |

## Forbidden during Fix Cycle

- Reading biz-14 / biz-15 **failure details** to choose code changes  
- Adjusting pilot scripts or expectations on unseen rows to green tests  
- Using unseen Actual JSON as acceptance criteria before independent CPO run  

## Allowed

- Layer A **1-turn probe** runs on unseen (observability only) — report pass/fail without using results to patch  
- After fix + dev + regression pass: **one-shot** CPO/unseen evaluation run  

## Violation

If unseen is used during fix → that run **invalidates** unseen gate; re-baseline unseen scripts only via CPO-approved matrix change (not hotfix).
