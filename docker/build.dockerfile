FROM debian:buster
MAINTAINER Rong Zhou "zhourong@qiniu.com"


RUN echo 'deb http://mirrors.aliyun.com/debian/ buster main non-free contrib'                  >  /etc/apt/sources.list && \
    echo 'deb http://mirrors.aliyun.com/debian/ buster-proposed-updates main non-free contrib' >> /etc/apt/sources.list && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -qy --no-install-recommends ca-certificates && \
    echo 'deb https://mirrors.aliyun.com/debian/ buster main non-free contrib'                  >  /etc/apt/sources.list && \
    echo 'deb https://mirrors.aliyun.com/debian/ buster-proposed-updates main non-free contrib' >> /etc/apt/sources.list && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -qy --no-install-recommends make wget xz-utils wine wine64 unzip python2.7 build-essential curl git tzdata && \
    ln -sf /usr/bin/python2.7 /usr/bin/python && \
    rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
RUN curl -fsSL "http://resources.koderover.com/docker-cli-v19.03.2.tar.gz" -o docker.tgz && \
    tar -xvzf docker.tgz && \
    mv docker/* /usr/local/bin
RUN curl -L "http://resource.koderover.com/reaper" -o reaper && \
    chmod +x reaper && \
    mv reaper /usr/local/bin
RUN wget -q --tries=0 -c -O /tmp/node-v12.22.7-linux-x64.tar.xz http://mirrors.qiniu-solutions.com/node-v12.22.7-linux-x64.tar.xz && \
    tar xf /tmp/node-v12.22.7-linux-x64.tar.xz --strip-components=1 --exclude=CHANGELOG.md --exclude=LICENSE --exclude=README.md -C /usr/local && \
    rm /tmp/node-v12.22.7-linux-x64.tar.xz
RUN npm config set registry https://registry.npmmirror.com && \
    npm install yarn -g && \
    yarn config set registry https://registry.npmmirror.com && \
    yarn config set electron_mirror https://repo.huaweicloud.com/electron/
RUN mkdir -p /root/.cache && \
    wget -q --tries=0 -c -O /tmp/electron-cache-v4.2.7.tar.xz http://mirrors.qiniu-solutions.com/electron-cache-v4.2.7.tar.xz && \
    tar xf /tmp/electron-cache-v4.2.7.tar.xz -C /root/.cache && \
    rm /tmp/electron-cache-v4.2.7.tar.xz
WORKDIR /kodo-browser
ENTRYPOINT ["reaper"]
