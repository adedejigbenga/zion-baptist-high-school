-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "TermName" AS ENUM ('FIRST', 'SECOND', 'THIRD');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PublicationAction" AS ENUM ('PUBLISHED', 'UNPUBLISHED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "loginId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "dateOfBirth" DATE,
    "gender" "Gender",
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "department" TEXT,
    "qualification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicSession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Term" (
    "id" TEXT NOT NULL,
    "name" "TermName" NOT NULL,
    "sessionId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolClass" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "section" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentEnrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StudentEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSubject" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAssignment" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingScheme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradingScheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentComponent" (
    "id" TEXT NOT NULL,
    "gradingSchemeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "maxScore" DECIMAL(6,2) NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AssessmentComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeBand" (
    "id" TEXT NOT NULL,
    "gradingSchemeId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "minScore" DECIMAL(5,2) NOT NULL,
    "maxScore" DECIMAL(5,2) NOT NULL,
    "remark" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GradeBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "gradingSchemeId" TEXT NOT NULL,
    "status" "ResultStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultEntry" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "totalScore" DECIMAL(6,2),
    "grade" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResultEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultEntryScore" (
    "id" TEXT NOT NULL,
    "resultEntryId" TEXT NOT NULL,
    "assessmentComponentId" TEXT NOT NULL,
    "score" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "ResultEntryScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultPublication" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "publishedById" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "PublicationAction" NOT NULL,

    CONSTRAINT "ResultPublication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "targetClassId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_loginId_key" ON "User"("loginId");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_admissionNumber_key" ON "Student"("admissionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_userId_key" ON "Teacher"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_employeeNumber_key" ON "Teacher"("employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_userId_key" ON "Admin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicSession_name_key" ON "AcademicSession"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Term_sessionId_name_key" ON "Term"("sessionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Term_id_sessionId_key" ON "Term"("id", "sessionId");

-- CreateIndex
CREATE INDEX "SchoolClass_level_idx" ON "SchoolClass"("level");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClass_name_section_key" ON "SchoolClass"("name", "section");

-- CreateIndex
CREATE INDEX "StudentEnrollment_classId_sessionId_idx" ON "StudentEnrollment"("classId", "sessionId");

-- CreateIndex
CREATE INDEX "StudentEnrollment_sessionId_idx" ON "StudentEnrollment"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentEnrollment_studentId_sessionId_key" ON "StudentEnrollment"("studentId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code");

-- CreateIndex
CREATE INDEX "ClassSubject_sessionId_classId_idx" ON "ClassSubject"("sessionId", "classId");

-- CreateIndex
CREATE INDEX "ClassSubject_subjectId_idx" ON "ClassSubject"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSubject_classId_subjectId_sessionId_key" ON "ClassSubject"("classId", "subjectId", "sessionId");

-- CreateIndex
CREATE INDEX "TeacherAssignment_classId_subjectId_sessionId_idx" ON "TeacherAssignment"("classId", "subjectId", "sessionId");

-- CreateIndex
CREATE INDEX "TeacherAssignment_sessionId_idx" ON "TeacherAssignment"("sessionId");

-- CreateIndex
CREATE INDEX "TeacherAssignment_subjectId_idx" ON "TeacherAssignment"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAssignment_teacherId_classId_subjectId_sessionId_key" ON "TeacherAssignment"("teacherId", "classId", "subjectId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "GradingScheme_name_key" ON "GradingScheme"("name");

-- CreateIndex
CREATE INDEX "AssessmentComponent_gradingSchemeId_sortOrder_idx" ON "AssessmentComponent"("gradingSchemeId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentComponent_gradingSchemeId_shortName_key" ON "AssessmentComponent"("gradingSchemeId", "shortName");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentComponent_gradingSchemeId_name_key" ON "AssessmentComponent"("gradingSchemeId", "name");

-- CreateIndex
CREATE INDEX "GradeBand_gradingSchemeId_minScore_idx" ON "GradeBand"("gradingSchemeId", "minScore");

-- CreateIndex
CREATE UNIQUE INDEX "GradeBand_gradingSchemeId_grade_key" ON "GradeBand"("gradingSchemeId", "grade");

-- CreateIndex
CREATE INDEX "Result_classId_termId_status_idx" ON "Result"("classId", "termId", "status");

-- CreateIndex
CREATE INDEX "Result_termId_idx" ON "Result"("termId");

-- CreateIndex
CREATE UNIQUE INDEX "Result_studentId_sessionId_termId_key" ON "Result"("studentId", "sessionId", "termId");

-- CreateIndex
CREATE INDEX "ResultEntry_subjectId_idx" ON "ResultEntry"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ResultEntry_resultId_subjectId_key" ON "ResultEntry"("resultId", "subjectId");

-- CreateIndex
CREATE INDEX "ResultEntryScore_assessmentComponentId_idx" ON "ResultEntryScore"("assessmentComponentId");

-- CreateIndex
CREATE UNIQUE INDEX "ResultEntryScore_resultEntryId_assessmentComponentId_key" ON "ResultEntryScore"("resultEntryId", "assessmentComponentId");

-- CreateIndex
CREATE INDEX "ResultPublication_resultId_publishedAt_idx" ON "ResultPublication"("resultId", "publishedAt");

-- CreateIndex
CREATE INDEX "ResultPublication_publishedById_idx" ON "ResultPublication"("publishedById");

-- CreateIndex
CREATE INDEX "Announcement_isPublished_publishedAt_idx" ON "Announcement"("isPublished", "publishedAt");

-- CreateIndex
CREATE INDEX "Announcement_targetClassId_idx" ON "Announcement"("targetClassId");

-- CreateIndex
CREATE INDEX "Announcement_createdById_idx" ON "Announcement"("createdById");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Term" ADD CONSTRAINT "Term_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentComponent" ADD CONSTRAINT "AssessmentComponent_gradingSchemeId_fkey" FOREIGN KEY ("gradingSchemeId") REFERENCES "GradingScheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeBand" ADD CONSTRAINT "GradeBand_gradingSchemeId_fkey" FOREIGN KEY ("gradingSchemeId") REFERENCES "GradingScheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_termId_sessionId_fkey" FOREIGN KEY ("termId", "sessionId") REFERENCES "Term"("id", "sessionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_gradingSchemeId_fkey" FOREIGN KEY ("gradingSchemeId") REFERENCES "GradingScheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultEntry" ADD CONSTRAINT "ResultEntry_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "Result"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultEntry" ADD CONSTRAINT "ResultEntry_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultEntryScore" ADD CONSTRAINT "ResultEntryScore_resultEntryId_fkey" FOREIGN KEY ("resultEntryId") REFERENCES "ResultEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultEntryScore" ADD CONSTRAINT "ResultEntryScore_assessmentComponentId_fkey" FOREIGN KEY ("assessmentComponentId") REFERENCES "AssessmentComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultPublication" ADD CONSTRAINT "ResultPublication_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "Result"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultPublication" ADD CONSTRAINT "ResultPublication_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_targetClassId_fkey" FOREIGN KEY ("targetClassId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================================================================
-- Database rules Prisma cannot express (ARCHITECTURE.md section 6.5). Hand-written; keep when regenerating.
-- Partial indexes, CHECK constraints, an exclusion constraint and a trigger are invisible to schema.prisma.
-- =====================================================================================================

-- (2) Only one current academic session, one current term, one default grading scheme.
CREATE UNIQUE INDEX "AcademicSession_only_one_current" ON "AcademicSession" ("isCurrent") WHERE "isCurrent" = true;
CREATE UNIQUE INDEX "Term_only_one_current" ON "Term" ("isCurrent") WHERE "isCurrent" = true;
CREATE UNIQUE INDEX "GradingScheme_only_one_default" ON "GradingScheme" ("isDefault") WHERE "isDefault" = true;

-- (3) PostgreSQL treats NULL as distinct in a normal unique index, so "JSS 1" with no section could be
--     inserted twice. This index closes that gap (classes WITH a section are covered by SchoolClass_name_section_key).
CREATE UNIQUE INDEX "SchoolClass_name_when_no_section" ON "SchoolClass" ("name") WHERE "section" IS NULL;

-- (4) Dates.
ALTER TABLE "AcademicSession" ADD CONSTRAINT "AcademicSession_dates_check" CHECK ("startDate" < "endDate");
ALTER TABLE "Term" ADD CONSTRAINT "Term_dates_check" CHECK ("startDate" < "endDate");

-- (4)/(5) Assessment components: a positive maximum score and a weight that is a percentage.
ALTER TABLE "AssessmentComponent" ADD CONSTRAINT "AssessmentComponent_maxScore_check" CHECK ("maxScore" > 0);
ALTER TABLE "AssessmentComponent" ADD CONSTRAINT "AssessmentComponent_weight_check" CHECK ("weight" > 0 AND "weight" <= 100);

-- (4) Grade bands: a valid range.
ALTER TABLE "GradeBand" ADD CONSTRAINT "GradeBand_range_check" CHECK ("minScore" >= 0 AND "minScore" <= "maxScore");

-- (5) Grade bands of one scheme must not overlap (inclusive ranges). Needs the btree_gist extension.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "GradeBand" ADD CONSTRAINT "GradeBand_no_overlap"
  EXCLUDE USING gist ("gradingSchemeId" WITH =, numrange("minScore", "maxScore", '[]') WITH &&);

-- (4) Scores: never negative, and never above the component's maximum score.
ALTER TABLE "ResultEntryScore" ADD CONSTRAINT "ResultEntryScore_score_check" CHECK ("score" >= 0);

CREATE FUNCTION "check_result_entry_score_max"() RETURNS trigger AS $$
DECLARE
  component_max numeric;
BEGIN
  SELECT "maxScore" INTO component_max FROM "AssessmentComponent" WHERE "id" = NEW."assessmentComponentId";
  IF NEW."score" > component_max THEN
    RAISE EXCEPTION 'Score % is above the maximum % for this assessment component', NEW."score", component_max
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ResultEntryScore_score_max_trigger"
  BEFORE INSERT OR UPDATE OF "score", "assessmentComponentId" ON "ResultEntryScore"
  FOR EACH ROW EXECUTE FUNCTION "check_result_entry_score_max"();
