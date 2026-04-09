import { Router } from 'express';
import { getAll, getOne, upsert, remove } from '../controllers/draftController.js';

const router = Router();

router.get('/',     getAll);
router.get('/:id',  getOne);
router.put('/:id',  upsert);
router.delete('/:id', remove);

export default router;
