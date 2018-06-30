"use strict";

/* Aliases for sanity */
const $ = document.querySelector.bind(document);

/**
 * Title
 * @returns string of html page title
 */
function getTitle(){
    return chrome.i18n.getMessage("mytabs").replace("%s", new Date().toLocaleString());
}

/**
 * Make a tab item for html
 * @param {*} tab Tab object
 * @param doc Document object
 * @param depth int of how deep to style
 * @returns dom of tab item
 */
function generateTabItem(tab, doc, depth){
    const par = doc.createElement("p");
    const item = document.createElement("a");
    item.href = tab.url;
    item.innerText = tab.title;
    par.appendChild(item);
    par.style.marginLeft = depth * 4 + "px";
    return par;
}

/**
 * Create all the dom for the tabs, by host
 * @param {*} hosts object of host key: tab array
 * @param {*} doc document object
 * @param {*} depth int for styling
 * @returns dom array of items
 */
function genHosts(hosts, doc, depth){
    const generatedDOM = [];
    const multiHost = Object.keys(hosts).length > 1;
    for(let key in hosts){
        if(multiHost){
            generatedDOM.push(genTitle(key, doc, depth));
        }
        const sorted = hosts[key].sort((a, b) => a.index - b.index);
        sorted.forEach(tab => {
            generatedDOM.push(generateTabItem(tab, doc, depth + 1));
        });
    }
    return generatedDOM;
}

/**
 * Create all the dom for hosts, by stack
 * @param {*} stacks object of stack string: host object
 * @param {*} doc document object
 * @param {*} depth int for styling
 * @returns dom array of items
 */
function genStacks(stacks, doc, depth){
    let generatedDOM = [];
    const multiStack = Object.keys(stacks).length > 1;
    for(let key in stacks){
        if(multiStack){
            generatedDOM.push(genTitle(key, doc, depth));
        }
        generatedDOM = generatedDOM.concat(genHosts(stacks[key], doc, multiStack ? depth + 1 : depth));
    }
    return generatedDOM;
}

/**
 * Generate a header dom item, e.g. h2, h3, h4
 * @param {*} message What string to use
 * @param {*} doc document object
 * @param {*} depth int for styling
 * @returns header dom
 */
function genTitle(message, doc, depth){
    const header = doc.createElement("h"+depth);
    header.innerText = message;
    header.style.marginLeft = depth * 4 + "px";
    return header;
}

/**
 * Generate the dom for windows, by stack
 * @param {*} windows object of indow id: stack object
 * @param {*} doc document object
 * @param {*} depth int for styling
 * @returns dom array of items generated
 */
function genWindows(windows, doc, depth){
    let generatedDOM = [];
    const multiWindow = Object.keys(windows).length > 1;
    for(let key in windows){
        if(multiWindow){
            generatedDOM.push(genTitle(key, doc, depth));
        }
        generatedDOM = generatedDOM.concat(genStacks(windows[key], doc, multiWindow ? depth + 1 : depth));
    }
    return generatedDOM;
}

/**
 * Get html page with tab info
 * @param {*} tabs object nested according to window, stack, host, then array of tab
 * @returns document object of tab page
 */
function generateHtml(tabs){
    const tabPage = document.implementation.createHTMLDocument(getTitle());
    const encoding = tabPage.createElement("meta");
    encoding.charset = "utf-8";
    tabPage.head.appendChild(encoding);
    tabPage.body.appendChild(genTitle(getTitle(), tabPage, 1));
    const doms = genWindows(tabs, tabPage, 2);
    doms.forEach(item => {
        tabPage.body.appendChild(item);
    });
    return tabPage;
}

/**
 * Organise tabs by stack (vivaldi only)
 * @param tabs Array of Tab
 * @return Objects {tab group string: Array of Tab}
 */
function organiseByStack(tabs){
    const allStacks = {
        none: []
    };
    tabs.forEach(tab => {
        if(!tab.extData){
            allStacks.none.push(tab);
        }
        try {
            const parsed = JSON.parse(tab.extData);
            if(parsed.group){
                if(allStacks[parsed.group]){
                    allStacks[parsed.group].push(tab);
                } else {
                    allStacks[parsed.group] = [tab];
                }
            } else {
                allStacks.none.push(tab);
            }
        } catch (e) {
            allStacks.none.push(tab);
        }
    });
    return allStacks;
}

/**
 * Organise tabs by host
 * @param tabs Array of Tab
 * @return Objects {host string: Array of Tab}
 */
function organiseByHost(tabs){
    const allHosts = {
        other: []
    };
    tabs.forEach(tab => {
        try{
            const host = new URL(tab.url).host;
            if(host === ""){
                allHosts.other.push(tab);
            } else if(allHosts[host]){
                allHosts[host].push(tab);
            } else {
                allHosts[host] = [tab];
            }
        } catch (e) {
            allHosts.other.push(tab);
        }
    });
    return allHosts;
}

/**
 * Organise tabs by window
 * @param tabs Array of Tab
 * @return Objects of window id: Array of Tab
 */
function organiseByWindow(tabs){
    const allWindows = {};
    tabs.forEach(tab => {
        if(allWindows[tab.windowId]){
            allWindows[tab.windowId].push(tab);
        } else {
            allWindows[tab.windowId] = [tab];
        }
    });
    return allWindows;
}


/**
 * Determine if hosts are required, and organise accordingly
 * @param stacks object of window: stack : [tab]
 * @returns object of window: stack: host: [tab]
 */
function doHosts(stacks){
    const hostSortOuter = {};
    for(let outerKey in stacks){
        let hostSortInner = {};
        for(let innerKey in stacks[outerKey]){
            if($("#host").checked){
                hostSortInner[innerKey] = organiseByHost(stacks[outerKey][innerKey]);
            } else {
                hostSortInner[innerKey] = {all: stacks[outerKey][innerKey]};
            }
        }
        hostSortOuter[outerKey] = hostSortInner;
    }
    return hostSortOuter;
}

/**
 * Determine if stacks are required, and organise accordingly
 * @param windows object of tabs organised by window
 * @returns object of window: stack: [tab]
 */
function doStacks(windows){
    const stackSort = {};
    for(let key in windows){
        if($("#stack").checked){
            stackSort[key] = organiseByStack(windows[key]);
        } else {
            stackSort[key] = {none: windows[key]};
        }
    }
    return stackSort;
}

/**
 * Determine if windows are required, and organise accordingly
 * @param tabs array of tabs
 * @returns object of window: [tab]
 */
function doWindows(tabs){
    if($("#window").checked){
        return organiseByWindow(tabs);
    } else {
       return {all: tabs};
    }
}

/**
 * Present the html page for download
 * @param page document object
 */
function presentPage(page){
    const htmlfile = new File(
        [`<!DOCTYPE html>` + page.documentElement.innerHTML],
        getTitle()+".html",
        {type: "text/html"}
    );
    const blob = window.URL.createObjectURL(htmlfile);
    chrome.tabs.create({url: blob}, () => {
        window.URL.revokeObjectURL(blob);
    });
}

// TODO WOULD ORGANISING BE MORE EFFICIENT IF DONE THE OTHER WAY AROUND - by host, then by stack, then by window?

/**
 * Make and download the HTML page
 */
function makeHtml(){
    chrome.tabs.query({}, tabs => {
        let organisedTabs = doWindows(tabs);
        organisedTabs = doStacks(organisedTabs);
        organisedTabs = doHosts(organisedTabs);
        const page = generateHtml(organisedTabs);
        presentPage(page);
    });
}

/**
 * Init page i18n and listeners
 */
$("#html").innerText = chrome.i18n.getMessage("ashtml");
$("#html").addEventListener("click", makeHtml);
$("#host + span").innerText = chrome.i18n.getMessage("host");
$("#window + span").innerText = chrome.i18n.getMessage("window");
$("#stack + span").innerText = chrome.i18n.getMessage("stack");
document.title = chrome.i18n.getMessage("name");
