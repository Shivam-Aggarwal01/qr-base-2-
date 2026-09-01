import test from "node:test";
import assert from "node:assert/strict";

import { isStudent } from "../src/services/authRoles";
import { getStudentRequestBuckets } from "../src/services/requestWorkflow";

const makeRequest = (status: any, userId: string) => ({
  id: "req-1",
  user_id: userId,
  status,
  items: [],
  purpose: "Lab work",
  request_number: "REQ-1",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

test("student roles are recognized for student request visibility", () => {
  assert.equal(isStudent("STUDENT"), true);
  assert.equal(isStudent("STUDENT_LEAD"), true);
  assert.equal(isStudent("STUDENT_AMBASSADOR"), true);
  assert.equal(isStudent("ADMIN"), false);
});

test("pending and approved requests stay visible to the student dashboard", () => {
  const pending = makeRequest("PENDING", "user-1");
  const approved = makeRequest("APPROVED", "user-1");
  const handed = makeRequest("HANDED_OVER", "user-1");
  const completed = makeRequest("COMPLETED", "user-1");
  const rejected = makeRequest("REJECTED", "user-1");

  const buckets = getStudentRequestBuckets(
    [pending, approved, handed, completed, rejected],
    "user-1",
  );

  assert.equal(buckets.pending.length, 1);
  assert.equal(buckets.approved.length, 1);
  assert.equal(buckets.completed.length, 2);
  assert.equal(buckets.total.length, 5);
  assert.equal(buckets.visible.length, 4);
});
