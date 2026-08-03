export interface CodePopupItem {
  title: string;
  subtitle: string;
  role: string;
  code: string;
  language: string;
  springNote?: string;
  securityLevel?: "High" | "Medium" | "Low";
}

export const codePopupContent: Record<string, CodePopupItem> = {
  "server.xml": {
    title: "server.xml",
    subtitle: "톰캣 서버 주 설정 파일",
    role: "톰캣 인프라의 뼈대를 이루는 최상위 설정 파일로, 포트, 커넥터, 스레드 풀, 엔진, 가상 호스트 등을 정의하고 제어합니다.",
    language: "xml",
    code: `<?xml version="1.0" encoding="UTF-8"?>
<Server port="8005" shutdown="SHUTDOWN">
  <!-- 1. 보안을 위한 전역 리스너 설정 -->
  <Listener className="org.apache.catalina.startup.VersionLoggerListener" />
  
  <!-- 2. G1GC 및 최적 스레드 풀 스케줄러 매핑 -->
  <Service name="Catalina">
    
    <!-- 서비스 포트 및 Connector 최적화 설정 -->
    <Connector port="8080" 
               protocol="org.apache.coyote.http11.Http11NioProtocol"
               connectionTimeout="20000"
               redirectPort="8443"
               maxThreads="200"
               minSpareThreads="25"
               acceptCount="100"
               server="SecuredWAS" /> <!-- WAS 정보 노출 방지 -->

    <!-- OpenSSL & HTTP/2 지원 HTTPS 커넥터 -->
    <Connector port="443" 
               protocol="org.apache.coyote.http11.Http11NioProtocol"
               SSLEnabled="true" 
               maxThreads="150" 
               scheme="https" 
               secure="true">
        <SSLHostConfig protocols="TLSv1.2+TLSv1.3">
            <Certificate certificateFile="conf/ssl/server.crt"
                         certificateKeyFile="conf/ssl/server.key"
                         type="RSA" />
        </SSLHostConfig>
    </Connector>

    <Engine name="Catalina" defaultHost="localhost">
      <Host name="localhost" appBase="webapps" unpackWARs="true" autoDeploy="false">
        <!-- 불필요한 호스트 접근 통제 및 로깅 밸브 -->
        <Valve className="org.apache.catalina.valves.AccessLogValve" 
               directory="logs" prefix="localhost_access_log" suffix=".txt"
               pattern="%h %l %u %t '%r' %s %b" />
      </Host>
    </Engine>
  </Service>
</Server>`,
    securityLevel: "High"
  },
  "web.xml": {
    title: "web.xml",
    subtitle: "전역 웹 애플리케이션 설정",
    role: "모든 웹 애플리케이션에 공통으로 적용되는 기본 서블릿(DefaultServlet, JspServlet 등), MIME 타입 매핑, 기본 세션 만료 정책 등을 구성합니다.",
    language: "xml",
    code: `<?xml version="1.0" encoding="UTF-8"?>
<web-app xmlns="https://jakarta.ee/xml/ns/jakartaee"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="https://jakarta.ee/xml/ns/jakartaee https://jakarta.ee/xml/ns/jakartaee/web-app_6_0.xsd"
         version="6.0">

    <!-- 1. 디렉터리 내부 파일 리스팅 비활성화 (DefaultServlet 재정의) -->
    <servlet>
        <servlet-name>default</servlet-name>
        <servlet-class>org.apache.catalina.servlets.DefaultServlet</servlet-class>
        <init-param>
            <param-name>debug</param-name>
            <param-value>0</param-value>
        </init-param>
        <init-param>
            <param-name>listings</param-name>
            <param-value>false</param-value> <!-- true로 설정 시 폴더 내 파일 목록 노출 취약점 발생 -->
        </init-param>
        <load-on-startup>1</load-on-startup>
    </servlet>

    <!-- 2. 세션 하이재킹 예방을 위한 전역 세션 만료 시간(분 단위) 설정 -->
    <session-config>
        <session-timeout>30</session-timeout>
        <cookie-config>
            <http-only>true</http-only> <!-- JS를 통한 세션 쿠키 탈취 차단 -->
            <secure>true</secure> <!-- HTTPS 전송 보장 -->
        </cookie-config>
    </session-config>

    <!-- 3. WAS 에러 처리 (오류 화면에서의 Tomcat 버전 노출 차단) -->
    <error-page>
        <error-code>404</error-code>
        <location>/WEB-INF/views/error/404.jsp</location>
    </error-page>
    <error-page>
        <error-code>500</error-code>
        <location>/WEB-INF/views/error/500.jsp</location>
    </error-page>

</web-app>`,
    springNote: "현대 Spring MVC 및 Spring Boot 아키텍처에서는 톰캣 전역 web.xml을 직접 건드리는 대신, 프로젝트 내부(WEB-INF/web.xml 또는 Spring Java Configuration)에 필터와 서블릿 등록을 위임하여 코드 레벨에서 독립적으로 제어합니다.",
    securityLevel: "High"
  },
  "context.xml": {
    title: "context.xml",
    subtitle: "웹 애플리케이션 컨텍스트 설정",
    role: "웹 애플리케이션 컨텍스트 전체에 공유되는 환경 속성이나 JNDI 커넥션 풀(DataSource)과 같은 외부 리소스를 선언합니다.",
    language: "xml",
    code: `<?xml version="1.0" encoding="UTF-8"?>
<Context>
    <!-- 1. 소스코드나 설정 파일 실시간 감시 정의 -->
    <WatchedResource>WEB-INF/web.xml</WatchedResource>
    <WatchedResource>WEB-INF/tomcat-web.xml</WatchedResource>
    <WatchedResource>\${CATALINA_BASE}/conf/web.xml</WatchedResource>

    <!-- 2. 전역 DB 커넥션 풀(JNDI Resource) 선언 예시 (DBCP2/HikariCP) -->
    <Resource name="jdbc/OracleDS"
              auth="Container"
              type="javax.sql.DataSource"
              factory="org.apache.tomcat.dbcp.dbcp2.BasicDataSourceFactory"
              driverClassName="oracle.jdbc.OracleDriver"
              url="jdbc:oracle:thin:@192.168.1.100:1521:orcl"
              username="app_user"
              password="EncryptedPasswordOrVault"
              maxTotal="50"
              maxIdle="10"
              maxWaitMillis="10000"
              validationQuery="SELECT 1 FROM DUAL"
              testOnBorrow="true" />
              
    <!-- Session Clustering 설정 시 Manager 정의 가능 -->
    <!-- <Manager className="org.apache.catalina.ha.session.DeltaManager" expireSessionsOnShutdown="false" /> -->
</Context>`,
    springNote: "클라우드 네이티브 및 MSA 아키텍처 환경에서는 이식성 극대화를 위해 톰캣 전역 context.xml 대신, 프로젝트 내부 Spring Boot(application.yml / HikariCP 설정)로 DataSource 및 커넥션 자원을 내재화해 개발합니다.",
    securityLevel: "Medium"
  },
  "logging.properties": {
    title: "logging.properties",
    subtitle: "톰캣 자체 로그 제어",
    role: "톰캣 엔진(Catalina, localhost, manager, host-manager) 내부에서 발생하는 로그의 레벨, 파일 로테이션 정책 및 출력 포맷을 정의합니다.",
    language: "properties",
    code: `# 1. 전역 로그 핸들러 지정 (콘솔 및 파일 출력용)
handlers = 1catalina.org.apache.juli.AsyncFileHandler, 2localhost.org.apache.juli.AsyncFileHandler, java.util.logging.ConsoleHandler

.handlers = 1catalina.org.apache.juli.AsyncFileHandler, java.util.logging.ConsoleHandler

# 2. Catalina 주 로그 핸들러 상세 설정
1catalina.org.apache.juli.AsyncFileHandler.level = INFO
1catalina.org.apache.juli.AsyncFileHandler.directory = \${catalina.base}/logs
1catalina.org.apache.juli.AsyncFileHandler.prefix = catalina.
1catalina.org.apache.juli.AsyncFileHandler.maxDays = 90
1catalina.org.apache.juli.AsyncFileHandler.encoding = UTF-8

# 3. Localhost 컨텍스트 엔진 로그 핸들러 상세 설정
2localhost.org.apache.juli.AsyncFileHandler.level = WARNING
2localhost.org.apache.juli.AsyncFileHandler.directory = \${catalina.base}/logs
2localhost.org.apache.juli.AsyncFileHandler.prefix = localhost.
2localhost.org.apache.juli.AsyncFileHandler.maxDays = 30
2localhost.org.apache.juli.AsyncFileHandler.encoding = UTF-8

# 4. 콘솔 출력기 포맷 및 레벨 관리
java.util.logging.ConsoleHandler.level = FINE
java.util.logging.ConsoleHandler.formatter = org.apache.juli.OneLineFormatter
java.util.logging.ConsoleHandler.encoding = UTF-8`,
    springNote: "애플리케이션 로그는 중복 로깅으로 인한 리소스 낭비와 병목을 막기 위해 톰캣 자체 로깅 엔진이 아닌, Spring 내부의 Logback / Log4j2 엔진에서 별도 경로로 단일하게 제어하도록 분리 수립하는 것이 베스트 프랙티스입니다.",
    securityLevel: "Medium"
  },
  "tomcat-users.xml": {
    title: "tomcat-users.xml",
    subtitle: "관리자 콘솔 권한 제어",
    role: "톰캣 관리자 웹 매니저 GUI(Manager App, Host Manager App)에 원격 및 로컬로 접근할 수 있는 사용자 역할(Role)과 계정을 등록 및 통제합니다.",
    language: "xml",
    code: `<?xml version="1.0" encoding="UTF-8"?>
<tomcat-users xmlns="http://tomcat.apache.org/xml"
              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
              xsi:schemaLocation="http://tomcat.apache.org/xml tomcat-users.xsd"
              version="1.0">

  <!-- 1. 매니저 GUI 및 호스트 매니저 역할 정의 -->
  <role rolename="manager-gui"/>
  <role rolename="manager-script"/>
  <role rolename="host-manager-gui"/>

  <!-- 2. 사용자 계정 생성 및 강력한 패스워드 설정 (개발 환경용) -->
  <!-- 보안 주의: 실무 운영 서버(Production)에서는 아래의 모든 계정 정의를 삭제하거나 주석 처리해야 합니다. -->
  <!-- <user username="admin" password="SUPER_SECURE_PASSWORD_123!" roles="manager-gui,host-manager-gui"/> -->
  
  <!-- 원격 배포/모니터링 스크립트 전용 계정 예시 -->
  <!-- <user username="deployer" password="DEPLOY_TOKEN_TOKEN" roles="manager-script"/> -->

</tomcat-users>`,
    springNote: "운영 환경 필수 보안 수칙: 실 서비스 환경에서는 무단 액세스 원천 봉쇄를 위해 내부 모든 계정을 주석 처리하거나, 톰캣 내부의 manager 웹 앱 폴더 자체를 물리적으로 완전히 삭제하는 것을 강력히 권장합니다.",
    securityLevel: "High"
  },
  "Case 1": {
    title: "Case 1",
    subtitle: "3대 서버 로드밸런싱 + 복잡한 Path 라우팅 + 세션 유지 (Sticky Session)",
    role: "이 케이스는 Nginx가 가장 압도적인 효율을 보여주는 영역이며, Apache도 안정적인 모듈로 대응 가능합니다.",
    language: "nginx",
    code: `# 1. Nginx: ip_hash를 이용한 Sticky Session 및 Path 분기 구성 예시
upstream backend_servers {
    ip_hash; # 클라이언트 IP 기반 세션 고정
    server 192.168.10.11:8080 max_fails=3 fail_timeout=10s;
    server 192.168.10.12:8080 max_fails=3 fail_timeout=10s;
}

server {
    listen 80;
    server_name api.example.com;

    location /api/v1/ {
        proxy_pass http://backend_servers; # 특정 패스 분기 라우팅
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# ----------------------------------------------------
# 2. Apache HTTPD: Cookie 기반 정교한 Sticky Session 구성 예시
# Header add Set-Cookie "ROUTEID=.%{BALANCER_WORKER_ROUTE}e; path=/" env=BALANCER_ROUTE_CHANGED
# <Proxy "balancer://mycluster">
#     BalancerMember "http://192.168.10.11:8080" route=node1
#     BalancerMember "http://192.168.10.12:8080" route=node2
#     ProxySet stickysession=ROUTEID
# </Proxy>
# ProxyPass "/api/v1/" "balancer://mycluster/"
# ----------------------------------------------------`,
    springNote: "결론 요약: Linux 환경에서 대규모 트래픽 분산과 경량 프록시가 중심이라면 Nginx를 추천하며, 쿠키(JSESSIONID 등) 기반 정밀 세션 유지가 필수라면 Apache가 뛰어납니다. IIS는 별도의 ARR 확장 모듈이 요구되어 상대적으로 무겁습니다.",
    securityLevel: "Medium"
  },
  "Case 2": {
    title: "Case 2",
    subtitle: "접근 Path별 Access 제한 (보안 및 Proxy 연동)",
    role: "특정 경로(/admin, /internal)에 대해 IP를 차단하거나 인증을 요구하는 케이스입니다. 이 영역은 Apache와 Nginx가 서로 다른 방식으로 강력합니다.",
    language: "nginx",
    code: `# 1. Nginx: 최전선에서의 초고속 가벼운 IP 차단 및 Proxy 연동
location /admin {
    allow 192.168.1.0/24;  # 사내 대역 IP만 허용
    deny all;              # 그 외 모든 대역 접속 차단
    
    proxy_pass http://admin_backend;
    proxy_set_header Host $host;
}

# ----------------------------------------------------
# 2. Apache HTTPD: 특정 디렉터리 레벨 .htaccess 보안 통제 예시
# <Location "/admin">
#     Require ip 192.168.1.0/24
#     AuthType Basic
#     AuthName "Restricted Admin Area"
#     AuthUserFile "/etc/httpd/.htpasswd"
#     Require valid-user
#     ProxyPass "http://admin_backend/admin"
# </Location>
# ----------------------------------------------------`,
    springNote: "결론 요약: I/O 오버헤드 없이 최전방에서 가볍게 IP 필터링을 하려면 Nginx가 뛰어나며, 메인 엔진의 재시작 없이 특정 폴더 단위로 수시로 독립 보안 정책(.htaccess)을 설정하고 싶다면 Apache가 강자입니다. Windows AD 사내 망 연동 시에는 IIS가 최고의 편의성을 가집니다.",
    securityLevel: "High"
  },
  "Case 3": {
    title: "Case 3",
    subtitle: "Windows 환경에서의 세팅 및 관리 편의성",
    role: "이 케이스는 당연히 IIS의 홈그라운드이며, 다른 엔진들은 Windows 환경에서 구조적 명확한 한계를 가집니다.",
    language: "powershell",
    code: `# 1. IIS: PowerShell을 이용한 Windows 웹 서버 가속 설치 및 포트 바인딩
Install-WindowsFeature -name Web-Server -IncludeManagementTools

# 신규 엔터프라이즈 포털 웹사이트 개설 및 포트 80 바인딩
New-IISSite -Name "EnterprisePortal" -PhysicalPath "C:\\inetpub\\wwwroot" -BindingInformation "*:80:"

# ----------------------------------------------------
# 2. Nginx & Apache on Windows 환경의 한계점
# Nginx 공식 경고: "Windows용 Nginx는 베타 성격의 포팅 버전입니다.
# Linux의 고성능 비동기 epoll 메커니즘을 사용하지 못해 대량 커넥션 처리에 부적합하며,
# 개발 및 테스트 환경 외의 운영(Production) 환경 도입은 권장하지 않습니다."
# ----------------------------------------------------`,
    springNote: "결론 요약: 인프라 전체가 Active Directory로 묶여있거나 .NET 프레임워크 기반의 사내 Windows Server 중심 운영 체제라면 GUI 중심의 압도적 편의성과 커널 가속을 보장하는 IIS가 최적입니다. Linux 중심 가상화 컨테이너 망 환경이라면 Nginx나 Apache가 표준입니다.",
    securityLevel: "Medium"
  }
};
