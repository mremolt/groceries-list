<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="color-scheme" content="light dark">
    <#assign pageTitle><#nested "title"></#assign>
    <title>${pageTitle?markup_string?trim?has_content?then(pageTitle?markup_string?trim, msg("appName"))}</title>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if properties.scripts?has_content>
        <#list properties.scripts?split(' ') as script>
            <script src="${url.resourcesPath}/${script}" type="text/javascript" defer></script>
        </#list>
    </#if>
    <script type="module">
        <#outputformat "JavaScript">
        import { startSessionPolling } from ${(url.resourcesPath + "/js/authChecker.js")?c};

        startSessionPolling(
            ${url.ssoLoginInOtherTabsUrl?c}
        );
        </#outputformat>
    </script>
    <#if authenticationSession??>
        <script type="module">
            <#outputformat "JavaScript">
            import { checkAuthSession } from ${(url.resourcesPath + "/js/authChecker.js")?c};

            checkAuthSession(
                ${authenticationSession.authSessionIdHash?c}
            );
            </#outputformat>
        </script>
    </#if>
</head>
<body data-page-id="login-${pageId}">
<div class="page">
    <p class="app-name" aria-hidden="true">${msg("appName")}</p>
    <main class="card">
        <h1 id="kc-page-title"><#nested "header"></h1>

        <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
            <div class="alert alert-${message.type}" <#if message.type = 'error'>role="alert"<#else>role="status"</#if>>
                <span class="alert-text"><#if message.type = 'error'><span class="error-prefix">${msg("errorPrefix")} </span></#if>${kcSanitize(message.summary)?no_esc}</span>
            </div>
        </#if>

        <#nested "form">

        <#if displayInfo>
            <div id="kc-info" class="info"><#nested "info"></div>
        </#if>
    </main>
</div>
</body>
</html>
</#macro>

<#-- Field error: prefix "Fehler:" (FR-FB-04 AC2), linked to the field by id. -->
<#macro fieldError id text>
    <p id="${id}" class="field-error"><svg class="error-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2 1 21h22L12 2Zm1 15h-2v-2h2v2Zm0-4h-2V9h2v4Z"/></svg><span><span class="error-prefix">${msg("errorPrefix")} </span>${kcSanitize(text)?no_esc}</span></p>
</#macro>

<#macro passwordToggle target>
    <button type="button" class="toggle" data-password-toggle aria-controls="${target}" aria-pressed="false" aria-label="${msg("showPassword")}">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5c-5 0-9.3 3.1-11 7 1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7Zm0 11.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z"/></svg>
    </button>
</#macro>
