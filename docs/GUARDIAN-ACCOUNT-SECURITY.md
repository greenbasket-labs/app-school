# Guardian Account Security

## Decision

Guardian records captured by a school may bootstrap a parent/guardian login, but school-supplied contact information is not treated as authentication by itself.

The durable relationship is:

```text
Guardian record
    ↓
Invitation / account bootstrap
    ↓
User identity
    ↓
Guardian ↔ User link
    ↓
First-login password change
    ↓
Contact verification
    ↓
Protected guardian access
```

## Account bootstrap

A school can invite a guardian when the Guardian record contains an email address. The invitation is scoped to the school and guardian and uses a single-use, expiring token whose hash is persisted.

Accepting the invitation creates the User identity, links it to the Guardian, creates the school membership required by the current application model, and creates guardian account-security state.

The bootstrap password is temporary. The account is marked `mustChangePassword = true` and the first authenticated session must complete the password-change step before protected guardian information is considered available.

## Contact verification

The invitation flow marks the recorded email as verified because the invitation is the email-delivered bootstrap factor. This assumption is valid only when production delivery sends the secret invitation to the recorded email address.

Phone verification is a separate explicit verification state. Phone verification tokens are stored hashed, expire after 15 minutes, and are single-use. Token delivery belongs to the communication/delivery boundary and must not be implemented by returning a production verification secret to a browser API.

## Authorization rule

Guardian access must never be granted solely because:

- an email matches `Guardian.email`;
- a phone matches `Guardian.phone`;
- a Student ID is supplied by the browser;
- a school ID is supplied by the browser; or
- a user has a school membership without a Guardian relationship.

Protected parent/student access must resolve the authenticated User to the explicitly linked Guardian and then use `StudentGuardian` relationships to establish which students that guardian may access.

The result-access chain remains:

```text
Authenticated identity
    ↓
Verified guardian identity
    ↓
Authorized student relationship
    ↓
Published result
    ↓
Result access setting
    ↓
Free access OR verified entitlement
    ↓
Result access
```

## Implementation boundary

Current implementation adds:

- durable `GuardianAccountSecurity` state;
- first-login password-change enforcement endpoint;
- login response flag for first-login password change;
- guardian contact-verification state endpoint;
- durable phone-verification token storage and verification service;
- temporary-password account bootstrap from the existing parent-access invitation;
- server-side guardian-to-student authorization for protected result reads;
- protected parent result route that evaluates publication, school result-access settings and the exact student/session/term entitlement.

The external email/SMS delivery adapter remains a communication concern and is not duplicated inside guardian identity logic.

## Result authorization boundary

The authenticated guardian's `User` identity is resolved to its explicitly linked Guardian record. The server then resolves the requested student through `StudentGuardian` in the same school. Browser-supplied school/student IDs are never accepted as proof of relationship.

A result read is allowed only after:

1. the guardian account has completed the first-login password change;
2. email or phone verification exists;
3. the requested student is linked to that guardian in the school's `StudentGuardian` records;
4. the selected session/term belongs to that school and the student has a valid enrollment;
5. the result is published; and
6. the commercial result-access policy allows free access or an entitlement exists for the exact school/student/session/term tuple.

Payment entitlement therefore cannot unlock another student's result, another school's result, an unpublished result, or a different academic period.

## Follow-on requirements

- Add complete browser/UI parent result workflow and student selection surface.
- Integrate production email/SMS delivery adapters without exposing verification secrets to browsers.
- Complete commercial payment initiation from the parent result payment-required state.
- Add broader integration tests covering cross-school IDs, unrelated guardians, unpublished results, wrong academic periods and paid/free access paths.
