/*
  # Add message status tracking

  1. Changes
    - Add status column to messages table
    - Add delivered_at timestamp
    - Add read_at timestamp
  
  2. Security
    - Update RLS policies to include new columns
*/

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Update the existing policy to include new columns
DROP POLICY IF EXISTS "Users can read messages they sent or received" ON messages;

CREATE POLICY "Users can read messages they sent or received"
ON messages
FOR SELECT
TO authenticated
USING (
  auth.uid() = sender_id OR 
  recipient_email = auth.jwt()->>'email'
);

-- Allow recipients to update message status
CREATE POLICY "Recipients can update message status"
ON messages
FOR UPDATE
TO authenticated
USING (recipient_email = auth.jwt()->>'email')
WITH CHECK (
  recipient_email = auth.jwt()->>'email' AND
  (
    (status = 'delivered' AND delivered_at IS NOT NULL) OR
    (status = 'read' AND read_at IS NOT NULL)
  )
);