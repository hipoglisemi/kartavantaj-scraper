import { AuditManager } from './src/services/AuditManager';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    const manager = new AuditManager();
    // Default limit is 100 recent active campaigns per run
    // This ensures we catch new ones while slowly cleaning old ones
    await manager.runMasterAudit(100);
}

main().catch(err => {
    console.error('💥 Master Audit CRASHED:', err);
    process.exit(1);
});
