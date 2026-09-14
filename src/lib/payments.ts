import { Temporal } from "@js-temporal/polyfill";
import { db } from "../prisma/db";
import { hasPermission } from "./permissions";
import { writeAuditLog } from "./audit";

export type CreatePaymentInput = {
  schoolId: number;
  studentId: number;
  cashierUserId: number;
  amount: number;
  method:
    | "CASH"
    | "BANK_TRANSFER"
    | "POS"
    | "ONLINE"
    | "OTHER";
  paymentDate: Date;
  reference?: string;
  description?: string;
};

function decimal(value: number) {
  return value.toFixed(2);
}

function toInstant(date: Date) {
  return Temporal.Instant.fromEpochMilliseconds(
    date.getTime(),
  );
}

/**
 * Calculate a student's current financial position.
 *
 * Balance:
 * Active fees - completed payments
 *
 * Refunded and cancelled payments are excluded.
 */
export async function getStudentBalance(
  schoolId: number,
  studentId: number,
) {
  const assignments =
    await db.orm.public.FeeAssignment.all();

  const payments =
    await db.orm.public.Payment.all();

  const totalFees = assignments
    .filter(
      (assignment) =>
        assignment.schoolId === schoolId &&
        assignment.studentId === studentId &&
        assignment.status === "ACTIVE",
    )
    .reduce(
      (total, assignment) =>
        total + Number(assignment.amount),
      0,
    );

  const totalPaid = payments
    .filter(
      (payment) =>
        payment.schoolId === schoolId &&
        payment.studentId === studentId &&
        payment.status === "COMPLETED",
    )
    .reduce(
      (total, payment) =>
        total + Number(payment.amount),
      0,
    );

  return {
    totalFees,
    totalPaid,
    balance: totalFees - totalPaid,
  };
}

/**
 * Get payments belonging to one student.
 */
export async function getStudentPayments(
  schoolId: number,
  studentId: number,
) {
  const payments =
    await db.orm.public.Payment.all();

  return payments
    .filter(
      (payment) =>
        payment.schoolId === schoolId &&
        payment.studentId === studentId,
    )
    .sort((a, b) => b.id - a.id);
}

/**
 * Generate the next receipt number for the school.
 */
async function generateReceiptNumber(
  schoolId: number,
) {
  const receipts =
    await db.orm.public.Receipt.all();

  const schoolReceipts = receipts.filter(
    (receipt) => receipt.schoolId === schoolId,
  );

  let highestNumber = 0;

  for (const receipt of schoolReceipts) {
    const match =
      receipt.receiptNumber.match(
        /(\d+)$/,
      );

    if (match) {
      const number = Number(match[1]);

      if (number > highestNumber) {
        highestNumber = number;
      }
    }
  }

  return `RCT-${new Date().getFullYear()}-${String(
    highestNumber + 1,
  ).padStart(6, "0")}`;
}

/**
 * Record a completed payment and automatically
 * create its receipt.
 */
export async function createPayment(
  input: CreatePaymentInput,
) {
  const allowed = await hasPermission(
    input.cashierUserId,
    "payments.create",
  );

  if (!allowed) {
    throw new Error(
      "Permission denied: payments.create",
    );
  }

  if (input.amount <= 0) {
    throw new Error(
      "Payment amount must be greater than zero.",
    );
  }

  const schools =
    await db.orm.public.School.all();

  const school = schools.find(
    (item) => item.id === input.schoolId,
  );

  if (!school) {
    throw new Error("School not found.");
  }

  const users =
    await db.orm.public.User.all();

  const cashier = users.find(
    (user) =>
      user.id === input.cashierUserId &&
      user.schoolId === input.schoolId,
  );

  if (!cashier) {
    throw new Error(
      "Cashier does not belong to this school.",
    );
  }

  const students =
    await db.orm.public.Student.all();

  const student = students.find(
    (item) =>
      item.id === input.studentId &&
      item.schoolId === input.schoolId,
  );

  if (!student) {
    throw new Error(
      "Student not found in this school.",
    );
  }

  const balance = await getStudentBalance(
    input.schoolId,
    input.studentId,
  );

  if (input.amount > balance.balance) {
    throw new Error(
      `Payment exceeds outstanding balance of ₦${balance.balance.toLocaleString(
        "en-NG",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
      )}.`,
    );
  }

  const paymentDate = toInstant(
    input.paymentDate,
  );

  const payment =
    await db.orm.public.Payment.create({
      schoolId: input.schoolId,
      studentId: input.studentId,
      cashierUserId: input.cashierUserId,
      amount: decimal(input.amount),
      method: input.method,
      paymentDate,
      reference:
        input.reference?.trim() || null,
      description:
        input.description?.trim() || null,
      status: "COMPLETED",
    });

  const receiptNumber =
    await generateReceiptNumber(
      input.schoolId,
    );

  const receipt =
    await db.orm.public.Receipt.create({
      schoolId: input.schoolId,
      paymentId: payment.id,
      receiptNumber,
    });

  await writeAuditLog({
    schoolId: input.schoolId,
    userId: input.cashierUserId,
    action: "CREATE",
    entity: "Payment",
    entityId: payment.id,
    newValue: {
      studentId: input.studentId,
      amount: input.amount,
      method: input.method,
      paymentDate: input.paymentDate,
      reference: input.reference?.trim() || null,
      receiptNumber,
    },
  });

  const updatedBalance =
    await getStudentBalance(
      input.schoolId,
      input.studentId,
    );

  return {
    payment,
    receipt,
    balance: updatedBalance,
  };
}

/**
 * Get a payment by ID.
 */
export async function getPaymentById(
  schoolId: number,
  paymentId: number,
) {
  const payments =
    await db.orm.public.Payment.all();

  return (
    payments.find(
      (payment) =>
        payment.id === paymentId &&
        payment.schoolId === schoolId,
    ) ?? null
  );
}

/**
 * Get the receipt belonging to a payment.
 */
export async function getReceiptForPayment(
  schoolId: number,
  paymentId: number,
) {
  const receipts =
    await db.orm.public.Receipt.all();

  return (
    receipts.find(
      (receipt) =>
        receipt.schoolId === schoolId &&
        receipt.paymentId === paymentId,
    ) ?? null
  );
}