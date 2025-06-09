/*
  # Create messages and users tables

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, foreign key to auth.users)
      - `recipient_email` (text)
      - `encrypted_content` (text)
      - `algorithm` (text)
      - `created_at` (timestamp)
    
  2. Security
    - Enable RLS on messages table
    - Add policies for authenticated users to:
      - Create their own messages
      - Read messages where they are the sender or recipient
*/

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users(id) NOT NULL,
  recipient_email text NOT NULL,
  encrypted_content text NOT NULL,
  algorithm text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can read messages they sent or received"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sender_id OR 
    recipient_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );