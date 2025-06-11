"""
Module for restoring cache data from backups for individual diseases or all diseases.
"""

import os
import asyncio
import shutil
import glob
from .utils import (
    setup_logging,
    log_error_to_json,
    find_latest_backup_for_disease,
    sanitize_disease_id,
    to_dossier_status_id,
    DISEASE_CACHE_DIR,
    BACKUP_DIR,
    BASE_DIR
)
from sqlalchemy import select, update
from datetime import datetime
import tzlocal

# Import database models
import sys
sys.path.append(BASE_DIR)
from build_dossier import SessionLocal
from db.models import DiseaseDossierStatus


async def update_disease_status(disease_id, status, processed_time=None):
    """Update disease status."""
    logger = setup_logging("update_status")
    
    # Convert disease_id to the format used in disease_dossier_status (spaces)
    dossier_status_id = to_dossier_status_id(disease_id)
    
    try:
        async with SessionLocal() as db:
            logger.info(f"Updating status for disease {disease_id} (dossier ID: {dossier_status_id}) to '{status}'")
            
            values = {"status": status}
            if processed_time:
                values["processed_time"] = processed_time
                
            update_stmt = (
                update(DiseaseDossierStatus)
                .where(DiseaseDossierStatus.disease == dossier_status_id)
                .values(**values)
            )
            await db.execute(update_stmt)
            await db.commit()
            logger.info(f"Successfully updated disease {disease_id} (dossier ID: {dossier_status_id}) status to '{status}'")
            return True
    except Exception as e:
        error_msg = f"Error updating disease {disease_id} (dossier ID: {dossier_status_id}) status to '{status}': {str(e)}"
        logger.error(error_msg)
        log_error_to_json(disease_id, "status_update_error", error_msg)
        return False


async def restore_single_disease(disease_id):
    """Restore a single disease from its latest backup."""
    logger = setup_logging("restore_single")
    logger.info(f"Starting restore for disease: {disease_id}")
    
    # Sanitize disease ID for file operations
    sanitized_id = sanitize_disease_id(disease_id)
    
    try:
        # Find the latest backup for this disease
        backup_file = find_latest_backup_for_disease(disease_id)
        
        if not backup_file:
            error_msg = f"No backup found for disease {disease_id}"
            logger.error(error_msg)
            log_error_to_json(disease_id, "restore_error", error_msg, module="restore")
            return False
        
        # Ensure cache directory exists
        os.makedirs(DISEASE_CACHE_DIR, exist_ok=True)
        
        # Copy the backup to the cache directory
        destination_file = os.path.join(DISEASE_CACHE_DIR, f"{sanitized_id}.json")
        shutil.copy2(backup_file, destination_file)
        
        # Update status to 'processed' with current timestamp
        current_time = datetime.now(tzlocal.get_localzone())
        await update_disease_status(disease_id, "processed", current_time)
        
        logger.info(f"Successfully restored disease {disease_id} from backup {os.path.basename(backup_file)}")
        return True
        
    except Exception as e:
        error_msg = f"Error restoring disease {disease_id}: {str(e)}"
        logger.error(error_msg)
        log_error_to_json(disease_id, "restore_error", error_msg, module="restore")
        return False


async def restore_from_backup():
    """Restore all diseases from their latest backups."""
    logger = setup_logging("restore_all")
    logger.info("Starting restore for all backed-up diseases...")
    
    try:
        # Ensure cache directory exists
        os.makedirs(DISEASE_CACHE_DIR, exist_ok=True)
        
        # Get all backup files
        backup_dir = os.path.join(BACKUP_DIR, "disease")
        backup_files = glob.glob(os.path.join(backup_dir, "*.json"))
        
        if not backup_files:
            logger.warning("No backup files found to restore.")
            return True
        
        # Group backup files by disease ID (in case there are multiple backups)
        disease_backups = {}
        for backup_file in backup_files:
            # Extract disease ID from filename (before the timestamp)
            filename = os.path.basename(backup_file)
            disease_id = filename.split("_")[0]
            if disease_id not in disease_backups:
                disease_backups[disease_id] = []
            disease_backups[disease_id].append(backup_file)
        
        # Sort backups for each disease by modification time (newest first)
        for disease_id in disease_backups:
            disease_backups[disease_id].sort(key=os.path.getmtime, reverse=True)
        
        # Restore the latest backup for each disease
        success_count = 0
        for disease_id, backups in disease_backups.items():
            latest_backup = backups[0]
            destination_file = os.path.join(DISEASE_CACHE_DIR, f"{disease_id}.json")
            
            try:
                shutil.copy2(latest_backup, destination_file)
                
                # Update status to 'processed' with current timestamp
                current_time = datetime.now(tzlocal.get_localzone())
                await update_disease_status(disease_id, "processed", current_time)
                
                logger.info(f"Successfully restored disease {disease_id} from backup {os.path.basename(latest_backup)}")
                success_count += 1
                
            except Exception as e:
                error_msg = f"Error restoring disease {disease_id}: {str(e)}"
                logger.error(error_msg)
                log_error_to_json(disease_id, "restore_error", error_msg, module="restore")
            
            # Small delay to prevent overloading
            await asyncio.sleep(1)
        
        logger.info(f"Restore completed: {success_count}/{len(disease_backups)} diseases restored successfully")
        return success_count > 0
        
    except Exception as e:
        logger.error(f"Error during restore from backup: {str(e)}")
        return False


async def main():
    """Main entry point for restore module."""
    if len(sys.argv) > 1:
        # If disease ID is provided as argument, restore only that disease
        disease_id = sys.argv[1]
        result = await restore_single_disease(disease_id)
        if result:
            print(f"Restore of disease {disease_id} completed successfully.")
        else:
            print(f"Restore of disease {disease_id} failed. Check logs for details.")
    else:
        # Restore all diseases from backup
        result = await restore_from_backup()
        if result:
            print("Restore from backup completed successfully.")
        else:
            print("Restore from backup failed. Check logs for details.")


if __name__ == "__main__":
    asyncio.run(main())