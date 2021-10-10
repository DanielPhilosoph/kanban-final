// ============================
// ======== Consts ============
// ============================
const KEY_1 = 49;
const KEY_2 = 50;
const KEY_3 = 51;
const BACKSPCE_KEYCODE = 8;

//==========================
// ===== Global Vars =======
//==========================

let editTextValue = "";
let searchInput = document.querySelector("#search");
let pressed = new Set();
let errorLabel = document.querySelector("#error-label");
let contextMenu = document.querySelector("#context-menu");
let SelectedTask;
let SelectedTaskName;
let draggedTask;
let editFlag = false;

let addToDoButton = document.querySelector("#submit-add-to-do", );
let addInProgressButton = document.querySelector("#submit-add-in-progress");
let addDoneButton = document.querySelector("#submit-add-done");
let saveButton = document.querySelector("#save-btn");
let loadButton = document.querySelector("#load-btn");

// ============================
// ====== Main run ============
// ============================

addToDoButton.addEventListener('click', onAddClickHandler);
addInProgressButton.addEventListener('click', onAddClickHandler);
addDoneButton.addEventListener('click', onAddClickHandler);
saveButton.addEventListener('click', onSaveClickHandler);
loadButton.addEventListener('click', onLoadClickHandler);
searchInput.addEventListener('keyup', onKeyUpHandler);

document.addEventListener('click', onScreenClick);
document.addEventListener("dragover", onTaskDragOver);

let myTasks = localStorage.getItem('tasks');
if(myTasks === null || myTasks === undefined){
    ResetLocalStorage();       
}
reloadTasksPage(searchInput.value);

// ==================================
// ====== Event Function ============
// ==================================

// Click handler of document - if not on element, remove mark
function onScreenClick(event){
    if(SelectedTask != undefined){
        if(event.target != SelectedTask){
            changeSelectedTask("");
        }        
    }    
}

function onAddClickHandler(event){
    const target = event.target;   
    switch (target.id){
        case "submit-add-to-do":
            inputValue = getTextFromInputId("add-to-do-task");            
            AddToSection(inputValue, "todo", 0, true);    
            break;
        case "submit-add-in-progress":
            inputValue = getTextFromInputId("add-in-progress-task");
            AddToSection(inputValue, "in-progress", 0, true); 
            break;
        case "submit-add-done":
            inputValue = getTextFromInputId("add-done-task");
            AddToSection(inputValue, "done", 0, true);  
            break;  
    }   
    reloadTasksPage(searchInput.value);
}

async function onSaveClickHandler(){ 
    await SaveTasksOnServer(); 
    reloadTasksPage(searchInput.value);  
}

async function onLoadClickHandler(){   
    await getServerTasks();
    reloadTasksPage(searchInput.value); 
}

// ===> Search - search every key up <===
function onKeyUpHandler(event){       
    if (event.target.id === "search"){
        let searchQuery = document.getElementById("search").value;    
        reloadTasksPage(searchQuery);
        displayError(false);  
    }    
}    

function onTaskKeyDownHandler(event){        
    pressed.add(event.keyCode);
    let arrayOfKeys = [KEY_1, KEY_2, KEY_3];    
    if(event === undefined){
        return;
    }
    // Check key down
    for (let key = 0; key < arrayOfKeys.length; key++) {
        if(event.altKey && pressed.has(arrayOfKeys[key])){
            event.preventDefault();

            let target = event.target;             
            const taskManagerDataJSON = getLocalStorageTasks(); 
            const sectionArray = taskManagerDataJSON[target.dataset.section];
            let index = sectionArray.indexOf(target.textContent);

            //Deletes selected task and update
            sectionArray.splice(index, 1);
            localStorage.setItem('tasks', JSON.stringify(taskManagerDataJSON));
            //Add to the selected section
            if(arrayOfKeys[key] === KEY_1){
                AddToSection(target.textContent, 'todo'); 
            }
            else if(arrayOfKeys[key] === KEY_2){
                AddToSection(target.textContent, 'in-progress'); 
            }
            else if(arrayOfKeys[key] === KEY_3){
                AddToSection(target.textContent, 'done'); 
            }  
            reloadTasksPage(searchInput.textContent);                      
        }
        
    }
    if(pressed.has(BACKSPCE_KEYCODE) && editFlag === false){
        if(confirm("Are you sure you want to delete " + SelectedTaskName + " task?")){
            deleteTask();
            reloadTasksPage(searchInput.value);  
        }         
    }   
    pressed.clear();
}

function onTaskClickHandler(event){    
    changeSelectedTask(event.target);    
}

function onTaskDBClickHandler(event){
    let target = event.target;

    changeSelectedTask(event.target);    
    
    event.preventDefault();

    editFlag = true;
    target.contentEditable = true;
    editTextValue = target.textContent;                                                
    target.addEventListener("blur", onTaskBlur, true);  
    target.focus();                         
}

// ===> after edit - save changes <===
function onTaskBlur(event){   

    let target = event.target;
    let textAfterEdit = target.textContent;

    displayError(false);
    editFlag = false;
   
    if(textAfterEdit === ""){
        displayError(true, "Error: Empty task is not valid");    
        target.textContent = SelectedTaskName;
        return;
    }

    if (textAfterEdit != SelectedTaskName) {
        const tasksObject = getLocalStorageTasks();
        const arrayOfSection = tasksObject[SelectedTask.dataset.section];
        
        let taskBeforeEditIndex = arrayOfSection.indexOf(SelectedTaskName);
        arrayOfSection[taskBeforeEditIndex] = textAfterEdit; 
        SelectedTaskName = textAfterEdit;        
        localStorage.setItem('tasks', JSON.stringify(tasksObject));    
        reloadTasksPage(searchInput.textContent);
    }
}

// ===> On right click <===
function contextMenuTask(event){
    event.preventDefault();          

    changeSelectedTask(event.target);
    
    const { clientX: mouseX, clientY: mouseY } = event;
    
    contextMenu.style.top = `${mouseY}px`;
    contextMenu.style.left = `${mouseX}px`;
    
    contextMenu.classList.add("visible");

    document.addEventListener("click", OnContextMenuClick);

}

function OnContextMenuClick(event){    
    if (event.target.offsetParent == contextMenu){ 
        if (event.target.dataset.type === "Delete" ){                        
            if(confirm("Are you sure you want to delete " + SelectedTaskName + " task?")){
                deleteTask();
                reloadTasksPage(searchInput.value);  
            }                  
        }               
    }
    contextMenu.classList.remove("visible");
    document.removeEventListener("click", OnContextMenuClick);    
}

function dragEnter(event){
    event.target.classList.add('droppable-hovered');    
}

function dragLeave(event){    
   event.target.classList.remove('droppable-hovered');   
}

function dragDrop(event){
    event.target.classList.remove('droppable-hovered');
    let target = event.target;
    const taskManagerDataJSON = getLocalStorageTasks(); 
    const sectionArray = taskManagerDataJSON[SelectedTask.dataset.section];
    let index = sectionArray.indexOf(SelectedTaskName);
    // Remove from previous sction
    sectionArray.splice(index, 1);
    localStorage.setItem('tasks', JSON.stringify(taskManagerDataJSON));
    //Add to the new one in a specific index
    let indexDrop = parseInt(target.dataset.drop_div);    
    if(target.dataset.section === SelectedTask.dataset.section && indexDrop !== 0 && index < indexDrop){
        AddToSection(SelectedTask.textContent, target.dataset.section, indexDrop - 1);
    }
    else{
        AddToSection(SelectedTask.textContent, target.dataset.section, target.dataset.drop_div);
    }
    reloadTasksPage(searchInput.textContent); 
    displayError(false);       
}

function onTaskDragStart(event){
    //event.preventDefault();
    changeSelectedTask(event.target);
    
    event.target.style.opacity = .9;    
}

function onTaskDragEnd(event){
    event.target.style.opacity = "";
}

function onTaskDragOver(event){
    event.preventDefault();
}

function onMouseMove(event){
    let loader = document.querySelector(".loader");
    const { clientX: mouseX, clientY: mouseY } = event;
    
    loader.style.top = `${mouseY}px`;
    loader.style.left = `${mouseX}px`;
    
}

// ==================================
// ====== Server Function ============
// ==================================
async function SaveTasksOnServer(){
    const taskManagerDataString = localStorage.getItem('tasks');   
    
    loaderDisplay(true); 
    document.addEventListener('mousemove', onMouseMove);    

    const respons = await fetch("http://json-bins.herokuapp.com/bin/614af3924021ac0e6c080cb3", {
        method: "PUT", 
        headers: {        
            "Accept": "application/json",
            "Content-Type": "application/json",
        },        
        body: JSON.stringify({"tasks": taskManagerDataString}),
    })

    document.removeEventListener('mousemove', onMouseMove); 
    loaderDisplay(false);   

    if(!respons.ok){
        displayError(true, "Server Error: " + respons.status + " " + respons.statusText);   
    }
    else{
        displayError(true, "Tasks information was saved successfully!", "notification");
    }
    
}

async function getServerTasks(){ 
    
    loaderDisplay(true); 
    document.addEventListener('mousemove', onMouseMove);        
    
    const response = await fetch( "http://json-bins.herokuapp.com/bin/614af3924021ac0e6c080cb3", {
        method: "GET", 
        headers: {
            'Content-Type': 'application/json',           
        }
    });    
    
    document.removeEventListener('mousemove', onMouseMove); 
    loaderDisplay(false);     

    if(response != undefined && !response.ok){
        let errorString = "Load Error! => " + response.status + " " + response.statusText;
        displayError(true, errorString);
    }
    else{
        //recieve tasks from server, update local storage
        let tasksData = await response.json();             
        localStorage.clear();
    

        localStorage.setItem("tasks",tasksData.tasks); 
        displayError(true, "Tasks Loaded Succesfully","notification");
    }
}


// ==================================
// ======  Functions ============
// ==================================

function loaderDisplay(display){
    // Creating:
    //<div class="loader"><div></div><div></div><div></div><div></div></div>
    if(display){
        let body = document.querySelector("body");
        let divArray = []; 
        for (let i = 0; i < 4; i++) {
            divArray.push(createElement("div"));   
        }
        let loaderDiv = createElement("div", divArray, ["loader"]);
        const { clientX: mouseX, clientY: mouseY } = window.event;
    
        loaderDiv.style.top = `${mouseY}px`;
        loaderDiv.style.left = `${mouseX}px`;        
        body.append(loaderDiv);
    }
    else{
        let loader = document.querySelector(".loader");
        loader.remove();        
    }    
}

async function LoadPageFromServer() {
    await getServerTasks();
    reloadTasksPage(searchInput.value);  
} 

function ResetLocalStorage() {
    const tasks = {
        "todo": [],
        "in-progress": [],
        "done": [],        
    };
    localStorage.setItem('tasks', JSON.stringify(tasks)); 
}

/* 
*   ===> Adding task to LocalStorage <===
*/
function AddToSection(taskName, key, index = 0 ,showError = false){
    const tasksObject = getLocalStorageTasks();    
    const pSectionTasksArray = tasksObject[key];    
    if(taskName === ""){
        displayError(showError, "Add failed, task is empty.");    
        return;
    }
    if(index === 0){
        pSectionTasksArray.unshift(taskName);
    }
    else{
        pSectionTasksArray.splice(index, 0, taskName);
    }
    //pass input validation tests
    //update tasks and store in local storage        
    localStorage.setItem('tasks', JSON.stringify(tasksObject)); 
    displayError(showError,"Task was added succesfully","notification");    
}

// ===> gets id of input - return its value (as string) <===
function getTextFromInputId(id){
    let input = document.querySelector("#" + id);         
    let inputValue = input.value;
    // Erase input value
    input.value = "";
    return inputValue;
}

// refresh page according to local storage filtered by the query (search) text
function reloadTasksPage(query){ 
    let divArr = ["#div-to-do-tasks", "#div-in-progress-tasks", "#div-done-tasks"];
    for(let divId of divArr){
        let div = document.querySelector(divId);
        div.innerHTML = '';
        div.append(createTaskList(query, div.dataset.section, [div.dataset.section + "-tasks"]));         
    }  
    resetAddInputs();    
}

function resetAddInputs(){
    // Reset all add inputs
    document.querySelector("#add-to-do-task").value = "";
    document.querySelector("#add-in-progress-task").value = "";
    document.querySelector("#add-done-task").value = "";        
}

function getDivEvents(){
    return {
        'drop': dragDrop,
        'dragenter': dragEnter,
        'dragleave': dragLeave
    };       
}

function getTaskAttributs(key, counter){
    return {
        "data-section": key,                 
        'tabIndex': counter,
        'draggable': true                
    };  
}

function getTaskEventListeners(){
    return {
        'keydown': (event) => {onTaskKeyDownHandler(event)},
        'contextmenu': (event) => {contextMenuTask(event)},
        'click': (event) => {onTaskClickHandler(event)},
        'dblclick': (event) => {onTaskDBClickHandler(event)},
        'dragstart': (event) => {onTaskDragStart(event)},
        'dragend': (event) => {onTaskDragEnd(event)}                
    }; 
}

// ===> Creating UL element from key in "task" <===
//filter case insensative
function createTaskList(filter, key, css_classes){
    const tasksObject = getLocalStorageTasks();
    let ul_Elements_Array = [];     
    let counter = 0; 
    let div_Listeners = getDivEvents();
    for(let task of tasksObject[key]){         
        let taskLowerCase = task.toLowerCase();
        let filterLowerCase =  filter.toLowerCase();
        if(taskLowerCase.includes(filterLowerCase)){              
            let attributs = getTaskAttributs(key, counter);
            let task_Listeners = getTaskEventListeners();
            ul_Elements_Array.push(createElement('div', [], ["droppable-div"], {"data-section": key, 'data-drop_div': counter}, div_Listeners));                                  
            ul_Elements_Array.push(createElement("li", [task], ["task"], attributs, task_Listeners));
            //reset before next Items
            counter++;             
        }        
    }
    ul_Elements_Array.push(createElement('div', [], ["droppable-div"], {"data-section": key, 'data-drop_div': counter}, div_Listeners)); 
    
    return createElement("ul", ul_Elements_Array, [...css_classes], {"data-section": key});  
}

// ===> returns JSON of tasks <===
function getLocalStorageTasks(){     
    return JSON.parse(localStorage.getItem('tasks'));
}

// Display an error on screen
function displayError(visible, text = "", type = "error"){
    //check current state
    errorLabel.textContent = text;

    if(errorLabel.classList.contains("error")){
        if(type != "error"){
            applyErrorLabelClass("notification", "error");            
        }    
    }
    else {
        if(type == "error"){
            applyErrorLabelClass("error", "notification");            
        }    
    }        
    if(errorLabel.classList.contains("hidden")){
        if(visible){
            applyErrorLabelClass("visible", "hidden");            
        }    
    }
    else {
        if(!visible){
            applyErrorLabelClass("hidden","visible");            
        }    
    }    
}

function applyErrorLabelClass(applyClass, removeClass){
    errorLabel.classList.remove(removeClass);
    errorLabel.classList.add(applyClass);
}

// Deletes selected task from tasks
function deleteTask(){
    const tasksObject = getLocalStorageTasks();
        
    let taskIndex = tasksObject[SelectedTask.dataset.section].indexOf(SelectedTaskName);  
    if(taskIndex !== -1){
        tasksObject[SelectedTask.dataset.section].splice(taskIndex, 1);
    }              
    localStorage.setItem('tasks', JSON.stringify(tasksObject));   
}

function createElement(tagName, children = [], classes = [], attributes = {}, eventListeners = {}) {

    const myElement = document.createElement(tagName);

    for(const child of children){
        myElement.append(child);
    }

    for(const cls of classes){
        myElement.classList.add(cls);
    }

    for (const attr in attributes) {
        myElement.setAttribute(attr, attributes[attr]);
    }

    for (const [listener, handler] of Object.entries(eventListeners)){                                     
        myElement.addEventListener(listener, handler, true);
    }

    return myElement;    

}

function changeSelectedTask(target){
    
        if(target !== ""){
            if ( SelectedTask != undefined) {
                applySelectedClass(SelectedTask);
            }    
            SelectedTask = target;
            SelectedTaskName = SelectedTask.textContent;
            if (!SelectedTask.classList.contains("selected")) {
                SelectedTask.classList.add("selected");
            }
        }
        else{
            applySelectedClass(SelectedTask);
        }    
}

function applySelectedClass(SelectedTask, containsBoolian){
    if (SelectedTask.classList.contains("selected")) {
        SelectedTask.classList.remove("selected");
    }
}
