import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

import "./App.css";
import ChatHistory from "./components/ChatHistory";
import ChatUI from "./components/ChatUI";

const baseURL = process.env.REACT_APP_BACKEND_URL;

function App() {
  // const [chats, setChats] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  const [showLoginForm, setShowLoginForm] = useState(true);
  const [loginEmail, setLoginEmail] = useState();
  const [loginPassword, setLoginPassword] = useState();
  const [registerEmail, setRegisterEmail] = useState();
  const [registerPassword, setRegisterPassword] = useState();
  const [registerRepeatPassword, setRegisterRepeatPassword] = useState();

  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef(null);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  
  const [token, setToken] = useState("");
  const initAxios = () => {
    // console.log('initAxios Token', token);
    return axios.create({
      baseURL: baseURL,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      timeout: 60000
    });
  };

  useEffect(() => {
    if(localStorage.getItem('userToken')){
      setToken(localStorage.getItem('userToken'));
      setIsLoggedIn(true)
      if(token.length > 10){
        fetchChats();
      }
    }else{
      setIsLoggedIn(false)
    }
    
  }, [token]);

  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId);
    } else {
      setMessages([]);
    }
  }, [selectedChatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

  const fetchChats = async () => {
    try {
      const axios = initAxios();
      const response = await axios.get(`/chats/`);
      console.log('fetch chats list:', response)
      setChats(response.data);
    } catch (error) {
      console.error("Error fetching chats:", error);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const axios = initAxios();
      const response = await axios.get(`/chats/${chatId}/`);
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async () => {
    // Update the local state before sending the message to the backend
    setMessages([
      ...messages,
      {
        content: inputMessage,
        role: "user",
      },
    ]);
    setInputMessage("");

    setIsAssistantTyping(true);

    try {
      // Simulate a delay for the typewriting effect
      const delay = 1000 + Math.random() * 1000; // Random delay between 1-2 seconds
      setTimeout(async () => {
        try {
          const axios = initAxios();
          const response = await axios.post(`/chats/`, {
            chat_id: selectedChatId || undefined,
            message: inputMessage,
          });

          // If there was no selected chat, set the selected chat to the newly created one
          if (!selectedChatId) {
            setSelectedChatId(response.data.chat_id);
            setChats([{ id: response.data.chat_id }, ...chats]);
          } else {
            fetchMessages(selectedChatId);
          }
        } catch (error) {
          console.error("Error sending message:", error);
          setMessages([
            ...messages,
            {
              content:
                "⚠️ An error occurred while sending the message. Please make sure the backend is running.",
              role: "assistant",
            },
          ]);
        } finally {
          setIsAssistantTyping(false);
        }
      }, delay);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const createNewChat = async () => {
    try {
      const axios = initAxios();
      const response = await axios.post(`/chats/`);
      console.log('createNewChat', response) 
      const newChat = response.data;

      setChats([newChat, ...chats]);
      setSelectedChatId(newChat.id);
    } catch (error) {
      console.error("Error creating a new chat:", error);
    }
  };

  function formatMessageContent(content) {
    const sections = content.split(/(```[\s\S]*?```|`[\s\S]*?`)/g);
    return sections
      .map((section) => {
        if (section.startsWith("```") && section.endsWith("```")) {
          section = section.split("\n").slice(1).join("\n");
          const code = section.substring(0, section.length - 3);
          return `<pre><code class="code-block">${code}</code></pre>`;
        } else if (section.startsWith("`") && section.endsWith("`")) {
          const code = section.substring(1, section.length - 1);
          return `<code class="inline-code">${code}</code>`;
        } else {
          return section.replace(/\n/g, "<br>");
        }
      })
      .join("");
  }

  function loginUser(credentials) {
    return fetch(`${baseURL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    })
    .then(res => res.json())
    .then(data => {
      console.log('login token', data.access_token)
      localStorage.setItem('userToken', data.access_token)
      setToken(data.access_token);
      setIsLoggedIn(true)
    });
  }

  const handleLoginSubmit = async e => {
    e.preventDefault();
    loginUser({
      email: loginEmail,
      password: loginPassword
    });
  }

  async function registerUser(credentials) {
    fetch(`${baseURL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    })
    .then(res => res.json())
    .then(data => {
      console.log('register token', data.access_token)
      localStorage.setItem('userToken', data.access_token)
      setToken(data.access_token);
      setIsLoggedIn(true)
    });
  }
  
  const handleRegisterSubmit = async e => {
    e.preventDefault();
    registerUser({
      name: registerEmail,
      email: registerEmail,
      password: registerPassword
    });
  }

  const handleLogout = ()=>{
    localStorage.removeItem('userToken');
    setToken("");
    setIsLoggedIn(false)
  }

  return (
    <div className="App">
      <div className="headline">
        <h1>⚡ ChatGPT ⚡</h1>
      </div>
      {isLoggedIn?<div className="chat-container">
        <div className="chat-history-container">
          <button className="new-chat-button" onClick={createNewChat}>
            <strong>+ New Chat</strong>
          </button>
          <ChatHistory
            chats={chats}
            selectedChatId={selectedChatId}
            setSelectedChatId={setSelectedChatId}
          />
        </div>
        <ChatUI
          messages={messages}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          sendMessage={sendMessage}
          formatMessageContent={formatMessageContent}
          isAssistantTyping={isAssistantTyping}
          messagesEndRef={messagesEndRef}
        />
      </div>
      :<div>
        {showLoginForm?<div className="login-wrapper">
          <h1>Login Form</h1>
          <form onSubmit={handleLoginSubmit}>
            <label>
              <p>Email</p>
              <input type="text" onChange={e => setLoginEmail(e.target.value)}/>
            </label>
            <label>
              <p>Password</p>
              <input type="password" onChange={e => setLoginPassword(e.target.value)}/>
            </label>
            <div>
              <button type="submit">Login</button>
            </div>
          </form>
        </div>
        :<div className="login-wrapper">
          <h1>Register Form</h1>
          <form onSubmit={handleRegisterSubmit}>
            <label>
              <p>Email</p>
              <input type="text" onChange={e => setRegisterEmail(e.target.value)}/>
            </label>
            <label>
              <p>Password</p>
              <input type="password" onChange={e => setRegisterPassword(e.target.value)}/>
            </label>
            <label>
              <p>Repeat Password</p>
              <input type="password" onChange={e => setRegisterRepeatPassword(e.target.value)}/>
            </label>
            <div>
              <button type="submit">Register and Login</button>
            </div>
          </form>
        </div>}
      </div>}
      <div className="footer">
        {isLoggedIn? <p>
          <button onClick={handleLogout}>Logout</button>
        </p>
        :<p>
          {showLoginForm?<button onClick={()=>setShowLoginForm(false)}>Go to register form</button>
            :<button onClick={()=>setShowLoginForm(true)}>Go to login form</button>
          }
        </p>
      }
      </div>
    </div>
  );
}

export default App;
