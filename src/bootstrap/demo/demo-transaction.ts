import type {AuthoringPort} from '../../modules/content/application/ports/demo-authoring.js';
import type {AuthoringReceiptPort} from '../../modules/transaction-control/application/ports/demo-authoring-receipts.js';
import type { OrganizationPort } from '../../modules/organization/application/ports/demo-organization.js';
import type { IdentityPort } from '../../modules/identity/application/ports/demo-identity.js';
import type { ContentPort } from '../../modules/content/application/ports/demo-content.js';
import type { LearningPort } from '../../modules/learning/application/ports/demo-learning.js';
import type { AuditPort } from '../../modules/audit-lifecycle/application/ports/demo-audit.js';
import type { ReceiptPort } from '../../modules/transaction-control/application/ports/demo-receipts.js';
export interface DemoTransaction { authoring?:AuthoringPort; authoringReceipts?:AuthoringReceiptPort; organization:OrganizationPort; identity:IdentityPort; content:ContentPort; learning:LearningPort; audit:AuditPort; receipts:ReceiptPort }
export interface DemoTransactionRunner { run<T>(work:(tx:DemoTransaction)=>Promise<T>):Promise<T> }
