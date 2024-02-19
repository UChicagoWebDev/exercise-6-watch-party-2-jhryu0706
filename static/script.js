// Constants to easily refer to pages
const SPLASH = document.querySelector(".splash");
const PROFILE = document.querySelector(".profile");
const LOGIN = document.querySelector(".login");
const ROOM = document.querySelector(".room");
const getCurrentPath = () => window.location.pathname;
const getIsvalid = () => localStorage.getItem('isvalid');
const getUsername = () => localStorage.getItem('username');
let roomsData =[];
let messagesPollingInterval = null;


const passwordField = document.querySelector(".profile input[name=password]");
const repeatPasswordField = document.querySelector(".profile input[name=repeatPassword]");
const repeatPasswordMatches = () => {
  const p = document.querySelector(".profile input[name=password]").value;
  const r = repeatPasswordField.value;
  return p == r;
};

const checkPasswordRepeat = () => {
  return repeatPasswordMatches() ? repeatPasswordField.setCustomValidity('') : repeatPasswordField.setCustomValidity('Passwords must match');
}

passwordField.addEventListener("input", checkPasswordRepeat);
repeatPasswordField.addEventListener("input", checkPasswordRepeat);

function updateUsername(){
  username = getUsername();
  console.log("updating username:", username);
  if (username){
      element.textContent = username;
    }
  }

function router() {
  let path = getCurrentPath();
  updateUsername();
  let isvalid = getIsvalid();
  console.log("here is path: ", path);
  if(path === '/'){
    if (isvalid){
      //need to show welcome message and create room
      console.log("isvalid");
    document.querySelector(".loggedIn").classList.remove("hide");
    document.querySelector(".create").classList.remove("hide");
    document.querySelector(".signup").classList.add("hide");
    document.querySelector(".loggedOut").classList.add("hide");
  }
    else{
      console.log("not valid");
    document.querySelector(".loggedOut").classList.remove("hide");
    document.querySelector(".signup").classList.remove("hide");
    document.querySelector(".create").classList.add("hide");
    document.querySelector(".loggedIn").classList.add("hide");
    }
    navigateTo(SPLASH);
  }
  else if(path === '/login'){
    if(isvalid === 'true'){
      navigateTo(SPLASH);
    }
    else{
      navigateTo(LOGIN);
    }
  }
  else if(path === '/profile'){
    if(isvalid === 'true'){
      navigateTo(PROFILE);
    }
    else{
      sessionStorage.setItem('redirect','/profile');
      navigateTo(LOGIN);
    }
  }
  else if(path.startsWith('/room')){
    if(isvalid === 'true'){
      navigateTo(ROOM);
    }
    else{
      sessionStorage.setItem('redirect',path);
      navigateTo(LOGIN);
    }
  }
}

function navigateTo(currpage) {
  SPLASH.classList.add("hide");
  PROFILE.classList.add("hide");
  LOGIN.classList.add("hide");
  ROOM.classList.add("hide");
  clearInterval(messagesPollingInterval);
  messagesPollingInterval = null;
  currpage.classList.remove("hide");
  switch (currpage) {
    case SPLASH:
      history.pushState({page : "/"}, "Splash", "/");
      break;
    case PROFILE:
      history.pushState({page : "/profile"}, "Profile", "/profile");
      break;
    case LOGIN:
      history.pushState({page : "/login"}, "Login", "/login");
      break;
    case ROOM:
      let roomID = sessionStorage.getItem('roomID');  
      console.log("inside navigateTo roomID:",roomID);
      console.log("roomID:",roomID);
      history.pushState({page : `/room/${roomID}`}, "Room", `/room/${roomID}`);
      // at this point show all the messages associated with the room
      getMessages();
      getRoomInfo();
      messagesPollingInterval = setInterval(getMessages, 500);
      break;
    default:
      break;
    }}

function editRoomName(){
  document.querySelector('.room .editRoomName').classList.remove('hide');
  document.querySelector('.room .displayRoomName').classList.add('hide');
}
function postloginredirect(){
  let redirect = sessionStorage.getItem('redirect');
  updateUsername();
  sessionStorage.removeItem('redirect');
  if (redirect){
    switch (redirect){
      case '/profile':
        navigateTo(PROFILE);
        break;
      case '/room':
        navigateTo(ROOM);
        break;
      default:
        break;
  }}
  else{
    navigateTo(SPLASH);
  };}

function loadRooms(){
  fetch('/api/rooms',{
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  })
  .then(response => response.json())
  .then(data => {
    roomsData = data;
    console.log("this is loadrooms", roomsData);
    if (data.length === 0) {
      document.querySelector('.noRooms').classList.remove('hide');
      return;
    } else{
      document.querySelector('.noRooms').classList.add('hide');
    let roomlist = document.querySelector('.roomList');
    roomlist.innerHTML = '';
    data.forEach(room => {
      let roomdiv = document.createElement('div');
      roomdiv.classList.add('room');
      roomdiv.innerHTML = `<strong>[${room.id}] ${room.name}</strong>`;
      roomdiv.addEventListener('click',()=>{
        sessionStorage.setItem('roomID',room.id);
        sessionStorage.setItem('roomName',room.name);
        console.log("inside loadrooms roomID:",room.id);
        history.pushState({page : `/room/${room.id}`}, "Room", `/room/${room.id}`);
        router();
      });
      roomlist.appendChild(roomdiv);
    });}
  })
  .catch(error => console.error('Error:', error));
}


function getMessages() {
  let roomID = sessionStorage.getItem('roomID');
  fetch(`/api/allmessages?roomID=${ roomID }`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response not ok');
    }
    return response.json();
  })
  .then(messages => {
    const messagesContainer = document.querySelector('.room .messages');
    messagesContainer.innerHTML='';
    if (messages.length === 0) {
      // Display a message indicating no messages are available
      document.querySelector('.room .noMessages').classList.remove('hide');
    } else{
      document.querySelector('.room .noMessages').classList.add('hide');
    messages.forEach(ms => {
      const messageElement = document.createElement('message');
      const authorElement =document.createElement('author');
      authorElement.textContent= ms.user_id;
      const contentElement = document.createElement('content');
      contentElement.textContent = ms.body;
      messageElement.appendChild(authorElement);
      messageElement.appendChild(contentElement);
      messagesContainer.appendChild(messageElement);
    });
  }
  })
  return;
}

// changes roomname
function getRoomInfo() {
  let roomName = sessionStorage.getItem('roomName');
  document.getElementById('roomName').textContent = roomName;
  document.getElementById('roomlink').textContent = getCurrentPath();

}


window.onpopstate = (event) =>{
  if(event.state){
    router();
  }
}

//------------doing stuff on first load------------//
document.addEventListener('DOMContentLoaded',()=>{
  console.log("DOM loaded");
  router();
  loadRooms();
  });

function signup(){
  fetch('/api/signup',{
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    console.log(data);
    if (data) {
      localStorage.setItem('isvalid','true');
      localStorage.setItem('api_key',data.api_key);
      localStorage.setItem('username',data.name);
      updateUsername();
      router();
    }
  })
  .catch(error => console.error('Error:', error));
}

let roomnamebutton = document.getElementById('updateroomname');
roomnamebutton.addEventListener('click', function(e) {
  var newName = document.getElementById('newname').value;
  //send post request
  fetch('/api/roomname', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      roomID: sessionStorage.getItem('roomID'),
      updatedName: newName
      }),
    })
    .catch(error => {
      console.error('Error:',error);
    })
    .finally(()=>{
    document.querySelector('.room .editRoomName').classList.add('hide');
    document.querySelector('.room .displayRoomName').classList.remove('hide');
    sessionStorage.setItem('roomName',newName);
    getRoomInfo();
});
});

let postButton = document.getElementById('postButton');
postButton.addEventListener('click', function(e){
  console.log('posting message');
  e.preventDefault();
  var message = document.getElementById('commentBox').value;
  if (message) {
    fetch(`/api/newmessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': localStorage.getItem('username')
      },
      body: JSON.stringify({
        roomID: sessionStorage.getItem('roomID'),
        message: message
      }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to post message');
      }
      return response.json();
    })
    .then(data => {
      console.log('Success:', data);
      getMessages();
      commentBox.value = ''; 
    })
    .catch(error => console.error('Error:', error));
  } else {
    console.log("No message to add");
  }
});


function logout(){
  localStorage.clear();
  sessionStorage.clear();
  clearInterval(messagesPollingInterval);
  messagesPollingInterval = null;
  router();
}

function update() {
  //allows you to update a username even if its not currently logged in
  //val=0 for username, val=1 for password
  let newusername = document.querySelector('.profile input[name=username]').value;
  let newpassword = document.querySelector('.profile input[name=password]').value;
  fetch('/api/update_user', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': localStorage.getItem('api_key'),
      'X-User-ID': localStorage.getItem('username')
    },
    body: JSON.stringify({username: newusername, password: newpassword})
  })
  .then(response => {
    if (response.ok){
      localStorage.setItem('username',newusername);
      updateUsername();
    } 
    return response.json()})
  .then(data => {
    alert(data.message); // Notify the user
  })
  .catch(error => console.error('Error:', error));
}

document.getElementById('loginbutton').addEventListener('click',()=>{
  let form= document.querySelector('.alignedForm.login');
  let username = form.querySelector('input[name=username]').value;
  let password = form.querySelector('input[name=password]').value;
  if (username === '' || password === '') {
    document.querySelector('#loginfailmessage').classList.remove('hide');
    return;
  }
  fetch('/api/login',{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({username: username, password: password})
  })
  .then(response => response.json())
  .then(data=> {
    if (data) {
      console.log('Login success:', data);
      localStorage.setItem('isvalid','true');
      localStorage.setItem('api_key',data.api_key);
      localStorage.setItem('username',data.name);
      postloginredirect();
    }
    else{
      console.log('Login failed');
      document.querySelector('#loginfailmessage').classList.remove('hide');
    }
  })
  .catch(error => console.error('Error:', error));
});

const headers = document.querySelectorAll('.header h2s');
headers.forEach(header => {
  header.addEventListener('click', () => {
    navigateTo(SPLASH);
  });
});

const createRoomButton = document.getElementById('createRoomButton');
createRoomButton.addEventListener('click', () => {
  fetch('/rooms/new', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  })
});

// TODO:  On page load, read the path and whether the user has valid credentials:
//        - If they ask for the splash page ("/"), display it
//        - If they ask for the login page ("/login") and don't have credentials, display it
//        - If they ask for the login page ("/login") and have credentials, send them to "/"
//        - If they ask for any other valid page ("/profile" or "/room") and do have credentials,
//          show it to them
//        - If they ask for any other valid page ("/profile" or "/room") and don't have
//          credentials, send them to "/login", but remember where they were trying to go. If they
//          login successfully, send them to their original destination
//        - Hide all other pages

// TODO:  When displaying a page, update the DOM to show the appropriate content for any element
//        that currently contains a {{ }} placeholder. You do not have to parse variable names out
//        of the curly  braces—they are for illustration only. You can just replace the contents
//        of the parent element (and in fact can remove the {{}} from index.html if you want).

// TODO:  Handle clicks on the UI elements.
//        - Send API requests with fetch where appropriate.
//        - Parse the results and update the page.
//        - When the user goes to a new "page" ("/", "/login", "/profile", or "/room"), push it to
//          History

// TODO:  When a user enters a room, start a process that queries for new chat messages every 0.1
//        seconds. When the user leaves the room, cancel that process.
//        (Hint: https://developer.mozilla.org/en-US/docs/Web/API/setInterval#return_value)

// On page load, show the appropriate page and hide the others


// Custom validation on the password reset fields
