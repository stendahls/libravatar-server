# Libravatar Server

A node implementation of the [Libravatar API](https://wiki.libravatar.org/api/)

## Usage

```shell
$ npx @stendahls/libravatar-server
```

Without npx
```shell
npm i @stendahls/libravatar-server --only=production
./node_modules/.bin/libravatar-server
```

## Configuration

Create a `.env` file in the folder you start the server from.  
If you run from docker, create the .env file in the folder you build.

### Available values

`LISTEN_PORT`  
default: 4000  
allowed values: Kinda whatever you want

`DEFAULT_SIZE`  
default: 80  
allowed values: 1 - 512

`PROVIDER`  
default: file  
allowed values: `file` `elvis`

There might also be some specific options for some providers

### Providers


#### File
Loads avatars from a folder.  
The folder should contain jpg images where the name of the file should be the email you
want the avatar to be for. `my.email@example.com.jpg`

`FILE_PROVIDER_RAW_FOLDER`  
default: `./raw`  
allowed values: Any path


#### Elvis
Loads avatars from a "container" in [Elvis DAM](https://www.woodwing.com/en/digital-asset-management-system)


`ELVIS_PROVIDER_SERVER`  
Full url to Elvis server

`ELVIS_PROVIDER_USER`  
Username to log in with

`ELVIS_PROVIDER_PASSWORD`  
Password for the user to login with


`ELVIS_PROVIDER_AVATAR_CONTAINER`  
What container-id to look for avatars in

`ELVIS_PROVIDER_AVATAR_DOMAIN`  
Domain for the avatars found in Elvis, such as `example.com`
