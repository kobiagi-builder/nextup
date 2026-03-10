/**
 * Document Folder Routes
 *
 * Routes for /api/document-folders
 */

import { Router } from 'express'
import * as folderController from '../controllers/document-folder.controller.js'

const router = Router()

router.get('/', folderController.listFolders)
router.post('/', folderController.createFolder)
router.put('/:id', folderController.updateFolder)
router.delete('/:id', folderController.deleteFolder)

export default router
