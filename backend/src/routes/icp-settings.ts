import { Router } from 'express'
import { getIcpSettings, upsertIcpSettings } from '../controllers/icpSettings.controller.js'

const router = Router()

router.get('/', getIcpSettings)
router.put('/', upsertIcpSettings)

export default router
