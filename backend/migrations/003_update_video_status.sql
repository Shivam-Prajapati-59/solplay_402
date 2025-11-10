-- Update all existing videos from 'processing' to 'ready' status
UPDATE videos 
SET status = 'ready' 
WHERE status = 'processing';
