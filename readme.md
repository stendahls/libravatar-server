# Libreavatar Server

A node implementation of the [Libreavatar API](https://wiki.libravatar.org/api/)

## Usage

```shell
$ npx @stendahls/libreavatar-server
```

## Configuration

Create a `.env` file in the folder you start the server from

### Available values

`LISTEN_PORT`  
default: 4000  
allowed values: Kinda whatever you want

`DEFAULT_SIZE`  
default: 80  
allowed values: 16, 32, 48, 64, 80, 96, 128, 256, 512

`PROVIDER`  
default: file  
allowed values: `file`

There might also be some specific options for some providers

### Providers


#### File
Loads avatars from a folder.  
The folder should contain jpg images where the name of the file should be the email you
want the avatar to be for. `my.email@example.com.jpg`

`FILE_PROVIDER_RAW_FOLDER`  
default: `./raw`  
allowed values: Any path
