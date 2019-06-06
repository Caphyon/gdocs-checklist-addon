function onOpen(e) { 
  DocumentApp.getUi().createAddonMenu()
  .addItem('Run', 'onRunAddOnHandler')
  .addToUi();
}

function onInstall(e) {
  onOpen(e);
}

function onRunAddOnHandler(){
  // try to fix last issue error by appending blank spaces on first run
  var body = DocumentApp.getActiveDocument().getBody();
  var lastChild = body.getChild(body.getNumChildren() - 1);
  if(lastChild.getType() == DocumentApp.ElementType.LIST_ITEM) {
    DocumentApp.getActiveDocument().getBody().appendParagraph("   ");
  }
  
  // reset LIST_ID property on run and get list from cursor
  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('LIST_ID', '');
  
  var listId = getCursorListId();
  
  if(listId) {    
    showChecklistSidebar();
  } else {
    showCursorAlert();
  }
}

function showChecklistSidebar() {
  var ui = HtmlService.createHtmlOutputFromFile('sidebar').setTitle('Checklist');
  DocumentApp.getUi().showSidebar(ui);
}

function showCursorAlert() {
  var ui = DocumentApp.getUi();
  ui.alert(
    'There is no list at the cursor position',
    'Place the cursor over a list and run the add-on again',
    ui.ButtonSet.OK);
}

// gets the listId of the item from the cursor position
function getCursorListId() {  
  var doc = DocumentApp.getActiveDocument();  
  var cursor = doc.getCursor();  
  var cursorListId = null;
  
  if(cursor){
    var parent = cursor.getElement().getParent();
    var item = cursor.getElement();
    
    if(item) {
      if(item.getType() == DocumentApp.ElementType.LIST_ITEM) {
        cursorListId = item.asListItem().getListId();
      } else if (parent) {
        if(parent.getType() == DocumentApp.ElementType.LIST_ITEM) {
          cursorListId = parent.asListItem().getListId();
        }
      }
    }  
  }
  
  return cursorListId;
}

// runs through all list items in document and returns an object with information about the ones that have the specified listId
function getItemsFromDoc() {
  var userProperties = PropertiesService.getUserProperties();
  var docProperties = PropertiesService.getDocumentProperties();
  var listId = userProperties.getProperty('LIST_ID');
  var cursorListId = getCursorListId();
  
  // on run render the list from the cursor or if cursor is placed on another list, render it instead
  if(cursorListId && (cursorListId !== listId)) {
    listId = cursorListId;
    userProperties.setProperty('LIST_ID', listId);
  }
  
  var doc = DocumentApp.getActiveDocument();
  var listItems = doc.getBody().getListItems();  
  var listItemsInfo = [];
  var listItemsResponsiveInfo = [];  
  var text;  
  
  for (var i = 0; i < listItems.length; i++) {
    if(listItems[i].getListId() === listId) {
      text = listItems[i].getText();      
      // non-responsive info
      listItemsInfo.push(new Object({
        listId: listId,        
        stamp: docProperties.getProperty(listId + '[' + listItemsInfo.length + ']')
      }));
      // responsive info
      listItemsResponsiveInfo.push(new Object({
        text: text,
        checked: text ? listItems[i].editAsText().isStrikethrough(0) : false,
        nestingLevel: listItems[i].getNestingLevel()
      }));
    }
  }
  
  return new Object({ 
    listItemsInfo: listItemsInfo,
    listItemsResponsiveInfo: listItemsResponsiveInfo
   });
}

// update list item in document after change in sidebar
function updateItemInDoc(index, isChecked) {
  var doc = DocumentApp.getActiveDocument();
  var userProperties = PropertiesService.getUserProperties();
  var docProperties = PropertiesService.getDocumentProperties();
  var listId = userProperties.getProperty('LIST_ID');
  var docIndex = 0;
  var i = 0;
  
  var listItems = doc.getBody().getListItems();
  var currentDate = new Date();
  var userEmail = Session.getActiveUser().getEmail();
  
  // get the index (in the document) of the list item
  while (i < listItems.length){
    if(listItems[i].getListId() === listId){ 
      docIndex = i + index;
      i = listItems.length; // break from the loop
    } 
    i++;
  }
  
  // update change in doc
  var itemText = listItems[docIndex].editAsText();  
  if(isChecked) {
    var ln = itemText.getText().length;
    itemText.setStrikethrough(0, ln - 1, true);
    docProperties.setProperty( listId + '[' + index + ']', userEmail.replace(/@.*/, '') + Utilities.formatDate(currentDate, 'GMT + 2', "' @'HH:mm '-' dd.MM.yy"));    
  } else {    
    itemText.setStrikethrough(false);
    docProperties.deleteProperty( listId + '[' + index + ']');
  }  
}

/** HELPER FUNCTIONS **/

function resetState() {
  var userProperties = PropertiesService.getUserProperties();
  var docProperties = PropertiesService.getDocumentProperties();
  userProperties.deleteAllProperties();
  docProperties.deleteAllProperties();
}