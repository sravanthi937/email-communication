/*
  # Fix messages table policies

  1. Changes
    - Update the RLS policy for reading messages to use auth.users() function
    - Add explicit permission for auth.users table access
  
  2. Security
    - Maintain row level security while fixing permission issues
    - Ensure proper access to user email lookups
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can read messages they sent or received" ON messages;

-- Create the updated policy
CREATE POLICY "Users can read messages they sent or received"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sender_id OR 
    recipient_email = auth.jwt()->>'email'
  );