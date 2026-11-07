// Bundle only SDK services used by Solio, preserving the pinned authentication API.
import {Client,Account,Databases,Storage,Query,ID,Permission,Role} from 'appwrite';
window.Appwrite={Client,Account,Databases,Storage,Query,ID,Permission,Role};
