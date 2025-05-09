-- Update all workspaces to use google/gemini-2.0-flash-exp:free as the default model
UPDATE workspaces 
SET default_model = 'google/gemini-2.0-flash-exp:free' 
WHERE default_model = 'gpt-4-turbo-preview';

-- Update all presets to use google/gemini-2.0-flash-exp:free as the model
UPDATE presets 
SET model = 'google/gemini-2.0-flash-exp:free' 
WHERE model = 'gpt-4-turbo-preview';

-- Update all assistants to use google/gemini-2.0-flash-exp:free as the model
UPDATE assistants 
SET model = 'google/gemini-2.0-flash-exp:free' 
WHERE model = 'gpt-4-turbo-preview';

-- Update all chats to use google/gemini-2.0-flash-exp:free as the model
UPDATE chats 
SET model = 'google/gemini-2.0-flash-exp:free' 
WHERE model = 'gpt-4-turbo-preview';

