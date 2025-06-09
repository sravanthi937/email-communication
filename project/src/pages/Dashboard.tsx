import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { encryptMessage, decryptMessage } from '../lib/crypto';
import { Send, LogOut, Mail, Key, Lock, Check, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  sender_id: string;
  recipient_email: string;
  encrypted_content: string;
  algorithm: string;
  created_at: string;
  status: 'sent' | 'delivered' | 'read';
  delivered_at: string | null;
  read_at: string | null;
}

const Dashboard = () => {
  const { session, signOut } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [algorithm, setAlgorithm] = useState('AES');
  const [secretKey, setSecretKey] = useState('');
  const [decryptKey, setDecryptKey] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [decryptedContent, setDecryptedContent] = useState('');

  useEffect(() => {
    fetchMessages();
    // Set up real-time subscription for message updates
    const subscription = supabase
      .channel('messages_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch messages');
    } else {
      setMessages(data || []);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Verify recipient email exists in the system
      const { data: recipientExists, error: recipientError } = await supabase
        .from('users')
        .select('id')
        .eq('email', recipientEmail)
        .single();

      if (recipientError || !recipientExists) {
        toast.error('Recipient email not found in the system');
        return;
      }

      const encrypted = encryptMessage(newMessage, secretKey, algorithm);
      const { error } = await supabase.from('messages').insert({
        sender_id: session?.user.id,
        recipient_email: recipientEmail,
        encrypted_content: encrypted,
        algorithm,
        status: 'sent'
      });

      if (error) throw error;

      toast.success('Message sent successfully');
      setNewMessage('');
      setRecipientEmail('');
      setSecretKey('');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleDecrypt = async (message: Message) => {
    try {
      const decrypted = decryptMessage(message.encrypted_content, decryptKey, message.algorithm);
      setDecryptedContent(decrypted);
      
      // Update message status to 'read' if recipient
      if (message.recipient_email === session?.user.email && message.status !== 'read') {
        await supabase
          .from('messages')
          .update({ 
            status: 'read',
            read_at: new Date().toISOString()
          })
          .eq('id', message.id);
      }
      
      toast.success('Message decrypted successfully');
    } catch (error) {
      toast.error('Decryption failed. Please check your key.');
      setDecryptedContent('');
    }
  };

  const getMessageStatusIcon = (message: Message) => {
    switch (message.status) {
      case 'read':
        return <Eye className="h-4 w-4 text-green-600" title="Read" />;
      case 'delivered':
        return <Check className="h-4 w-4 text-blue-600" title="Delivered" />;
      default:
        return <Send className="h-4 w-4 text-gray-600" title="Sent" />;
    }
  };

  // Mark message as delivered when viewing
  useEffect(() => {
    const markDelivered = async () => {
      const undeliveredMessages = messages.filter(
        msg => 
          msg.recipient_email === session?.user.email && 
          msg.status === 'sent'
      );

      for (const msg of undeliveredMessages) {
        await supabase
          .from('messages')
          .update({ 
            status: 'delivered',
            delivered_at: new Date().toISOString()
          })
          .eq('id', msg.id);
      }
    };

    if (session?.user.email) {
      markDelivered();
    }
  }, [messages, session?.user.email]);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Mail className="h-8 w-8 text-indigo-600" />
            <h1 className="ml-2 text-2xl font-bold text-gray-900">Secure Messaging</h1>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <LogOut className="h-5 w-5 mr-1" />
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Send Message Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Send Encrypted Message</h2>
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Recipient Email</label>
                <input
                  type="email"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <textarea
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  rows={4}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Encryption Algorithm</label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value)}
                >
                  <option value="AES">AES</option>
                  <option value="DES">DES</option>
                  <option value="FEISTEL">Feistel Cipher</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Secret Key</label>
                <input
                  type="password"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Encrypted Message
              </button>
            </form>
          </div>

          {/* Messages List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Messages</h2>
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm text-gray-600">
                        {message.sender_id === session?.user.id ? 'To: ' : 'From: '}
                        {message.sender_id === session?.user.id
                          ? message.recipient_email
                          : message.recipient_email}
                      </p>
                      <div className="flex items-center space-x-2">
                        <p className="text-xs text-gray-500">
                          Algorithm: {message.algorithm}
                        </p>
                        {getMessageStatusIcon(message)}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(message.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-mono break-all">{message.encrypted_content}</p>
                  </div>
                  <div className="mt-4">
                    <div className="flex space-x-2">
                      <input
                        type="password"
                        placeholder="Enter decryption key"
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={selectedMessage?.id === message.id ? decryptKey : ''}
                        onChange={(e) => {
                          setSelectedMessage(message);
                          setDecryptKey(e.target.value);
                        }}
                      />
                      <button
                        onClick={() => handleDecrypt(message)}
                        className="flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                    </div>
                    {selectedMessage?.id === message.id && decryptedContent && (
                      <div className="mt-2 p-2 bg-gray-50 rounded-md">
                        <p className="text-sm">{decryptedContent}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;