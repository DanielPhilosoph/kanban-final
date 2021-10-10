// ============================
// ======== Consts ============
// ============================
const KEY_1 = 49;
const KEY_2 = 50;
const KEY_3 = 51;
const BACKSPCE_KEYCODE = 8;
const API_HTTP = "http://json-bins.herokuapp.com/bin/614af3924021ac0e6c080cb3";

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
// ====== Event Functions ===========
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
    // Check key down
    for (let key = 0; key < arrayOfKeys.length; key++) {
        if(event.altKey && pressed.has(arrayOfKeys[key])){
            event.preventDefault();            
            let target = event.target;
            deleteTask(target.textContent);
            addTaskByKey(target, key, arrayOfKeys);                                               
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

function addTaskByKey(target, key, arrayOfKeys){
    let arrayOfSections = ['todo', 'in-progress', 'done'];  
    for(let numberKey of arrayOfKeys){                
        if(numberKey === arrayOfKeys[key]){                    
            AddToSection(target.textContent, arrayOfSections[key]);
        }
    }  
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
    mouseElementPosition(contextMenu, event);    
    contextMenu.classList.add("visible");
    document.addEventListener("click", OnContextMenuClick);

}

function OnContextMenuClick(event){    
    if (event.target.offsetParent == contextMenu && event.target.dataset.type === "Delete"){                              
        if(confirm("Are you sure you want to delete " + SelectedTaskName + " task?")){
            deleteTask();
            reloadTasksPage(searchInput.value);                                
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
    let target = event.target;
    target.classList.remove('droppable-hovered'); 
    const sectionArray = getLocalStorageTasks()[SelectedTask.dataset.section];
    let index = sectionArray.indexOf(SelectedTaskName);
    deleteTask();      
    //Add to the new one in a specific index
    let indexDrop = parseInt(target.dataset.drop_div);
    placeTaskAfterDrag(indexDrop, target, index);         
    reloadTasksPage(searchInput.textContent); 
    displayError(false);       
}

function placeTaskAfterDrag(indexDrop, target, index){    
    if(target.dataset.section === SelectedTask.dataset.section && indexDrop !== 0 && index < indexDrop){
        AddToSection(SelectedTask.textContent, target.dataset.section, indexDrop - 1);
    }
    else{
        AddToSection(SelectedTask.textContent, target.dataset.section, target.dataset.drop_div);
    }
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
    mouseElementPosition(loader, event);    
}

// ===================================
// ====== Server Functions ===========
// ===================================

async function SaveTasksOnServer(){
    const taskManagerDataString = localStorage.getItem('tasks');   
    
    loaderDisplay(true); 
    document.addEventListener('mousemove', onMouseMove);    

    const response = await fetch(API_HTTP, {
        method: "PUT", 
        headers: {        
            "Accept": "application/json",
            "Content-Type": "application/json",
        },        
        body: JSON.stringify({"tasks": taskManagerDataString}),
    })

    document.removeEventListener('mousemove', onMouseMove); 
    loaderDisplay(false);   

    if(responseValidation(response, "Server")){       
        displayError(true, "Tasks information was saved successfully!", "notification");
    }
    
}

async function getServerTasks(){ 
    
    loaderDisplay(true); 
    document.addEventListener('mousemove', onMouseMove);        
    
    const response = await fetch(API_HTTP, {
        method: "GET", 
        headers: {
            'Content-Type': 'application/json',           
        }
    });    
    
    document.removeEventListener('mousemove', onMouseMove); 
    loaderDisplay(false);     

    if(responseValidation(response, "Loud")){            
        //recieve tasks from server, update local storage
        let tasksData = await response.json();             
        localStorage.clear();
        localStorage.setItem("tasks",tasksData.tasks); 
        displayError(true, "Tasks Loaded Succesfully","notification");
    }
}

function responseValidation(response, errorText = ""){
    if(response != undefined && !response.ok){
        let errorString = errorText + "Error! => " + response.status + " " + response.statusText;
        displayError(true, errorString);
        return false;
    }
    return true;
}

// ==================================
// ===========  DOM  ================
// ==================================

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
        mouseElementPosition(loaderDiv, window.event)             
        body.append(loaderDiv);
    }
    else{
        let loader = document.querySelector(".loader");
        loader.remove();        
    }    
}

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

function getTextFromInputId(id){
    let input = document.querySelector("#" + id);         
    let inputValue = input.value;
    // Erase input value
    input.value = "";
    return inputValue;
}

function resetAddInputs(){
    // Reset all add inputs
    document.querySelector("#add-to-do-task").value = "";
    document.querySelector("#add-in-progress-task").value = "";
    document.querySelector("#add-done-task").value = "";        
}

function mouseElementPosition(elementDOM, event){
    const { clientX: mouseX, clientY: mouseY } = event;    
    elementDOM.style.top = `${mouseY}px`;
    elementDOM.style.left = `${mouseX}px`;
}

// ==================================
// ==========  Tasks ================
// ==================================

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

// ===> Creating UL element from key in "task" <===
//filter case insensative
function createTaskList(filter, key, css_classes){
    const tasksObject = getLocalStorageTasks();
    let ul_Elements_Array = [];     
    let counter = 0;     
    let filterLowerCase =  filter.toLowerCase();
    for(let task of tasksObject[key]){         
        let taskLowerCase = task.toLowerCase();        
        if(taskLowerCase.includes(filterLowerCase)){                                      
            ul_Elements_Array.push(createElement('div', [], ["droppable-div"], {"data-section": key, 'data-drop_div': counter}, getDivEvents()));                                  
            ul_Elements_Array.push(createElement("li", [task], ["task"], getTaskAttributs(key, counter), getTaskEventListeners()));
            //reset before next Items
            counter++;             
        }        
    }
    ul_Elements_Array.push(createElement('div', [], ["droppable-div"], {"data-section": key, 'data-drop_div': counter}, getDivEvents())); 
    
    return createElement("ul", ul_Elements_Array, [...css_classes], {"data-section": key});  
}

// Deletes selected task from tasks
function deleteTask(TasktoDelete = SelectedTaskName){
    const tasksObject = getLocalStorageTasks();
        
    let taskIndex = tasksObject[SelectedTask.dataset.section].indexOf(TasktoDelete);  
    if(taskIndex !== -1){
        tasksObject[SelectedTask.dataset.section].splice(taskIndex, 1);
    }              
    localStorage.setItem('tasks', JSON.stringify(tasksObject));   
}

// ==================================
// ======  Local Storage ============
// ==================================

// ===> returns JSON of tasks <===
function getLocalStorageTasks(){     
    return JSON.parse(localStorage.getItem('tasks'));
}

function ResetLocalStorage() {
    const tasks = {
        "todo": [],
        "in-progress": [],
        "done": [],        
    };
    localStorage.setItem('tasks', JSON.stringify(tasks)); 
}

// ==================================
// ====  Errors and errorLabel ======
// ==================================

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


























