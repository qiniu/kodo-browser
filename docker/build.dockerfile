FROM debian:buster
MAINTAINER Rong Zhou "zhourong@qiniu.com"

RUN echo 'deb http://mirrors.aliyun.com/debian/ buster main non-free contrib'                  >  /etc/apt/sources.list && \
    echo 'deb http://mirrors.aliyun.com/debian/ buster-proposed-updates main non-free contrib' >> /etc/apt/sources.list && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -qy --no-install-recommends ca-certificates && \
    echo 'deb https://mirrors.aliyun.com/debian/ buster main non-free contrib'                  >  /etc/apt/sources.list && \
    echo 'deb https://mirrors.aliyun.com/debian/ buster-proposed-updates main non-free contrib' >> /etc/apt/sources.list && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -qy --no-install-recommends make wget xz-utils wine wine64 unzip python2.7 build-essential && \
    ln -sf /usr/bin/python2.7 /usr/bin/python && \
    rm -rf /var/lib/apt/lists/*
RUN wget -q --tries=0 -c -O /tmp/node-v11.15.0-linux-x64.tar.xz http://mirrors.qiniu-solutions.com/node-v11.15.0-linux-x64.tar.xz && \
    tar xf /tmp/node-v11.15.0-linux-x64.tar.xz --strip-components=1 --exclude=CHANGELOG.md --exclude=LICENSE --exclude=README.md -C /usr/local && \
    rm /tmp/node-v11.15.0-linux-x64.tar.xz
RUN npm config set registry https://registry.npm.taobao.org && \
    npm install yarn -g && \
    yarn config set registry https://registry.npm.taobao.org && \
    yarn config set electron_mirror https://npm.taobao.org/mirrors/electron/
RUN mkdir -p /root/.cache && \
    wget -q --tries=0 -c -O /tmp/electron-cache-v4.2.7.tar.xz http://mirrors.qiniu-solutions.com/electron-cache-v4.2.7.tar.xz && \
    tar xf /tmp/electron-cache-v4.2.7.tar.xz -C /root/.cache && \
    rm /tmp/electron-cache-v4.2.7.tar.xz

ADD archive.tar.gz /kodo-browser
WORKDIR /kodo-browser
CMD make i
