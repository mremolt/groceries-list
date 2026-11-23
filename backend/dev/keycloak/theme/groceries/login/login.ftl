<#import "template.ftl" as layout>
<#-- After "forgot password" Keycloak returns to this page with a success message. It then shows "Prüfe dein Postfach"
     (FR-AUTH-04 AC2): the same text whether the account exists or not. -->
<#assign sent = message?has_content && message.summary == msg("emailSentMessage")>
<@layout.registrationLayout displayMessage=!sent && !messagesPerField.existsError('username','password'); section>
    <#if section = "title"><#if sent>${msg("checkMailTitle")}<#else>${msg("loginAccountTitle")}</#if> | ${msg("appName")}
    <#elseif section = "header"><#if sent>${msg("checkMailTitle")}<#else>${msg("loginAccountTitle")}</#if>
    <#elseif section = "form" && sent>
        <div id="kc-info-message">
            <p class="lead" role="status">${msg("checkMailText", login.username!'')}</p>
            <p class="help">${msg("noMail")} <a id="resend" href="${url.loginResetCredentialsUrl}">${msg("doResend")}</a></p>
            <div class="actions"><a class="btn btn-outlined" href="${url.loginRestartFlowUrl}">${msg("backToLogin")}</a></div>
        </div>
    <#elseif section = "form">
        <#assign hasError = messagesPerField.existsError('username','password')>
        <form id="kc-form-login" action="${url.loginAction}" method="post" novalidate>
            <div class="field<#if hasError> invalid</#if>">
                <label for="username">${msg("email")}</label>
                <input id="username" name="username" type="text" inputmode="email" autocomplete="email" autofocus
                       value="${(login.username!'')}" dir="ltr"
                       <#if hasError>aria-invalid="true" aria-describedby="login-error"</#if> />
            </div>
            <div class="field<#if hasError> invalid</#if>">
                <label for="password">${msg("password")}</label>
                <div class="input-group" dir="ltr">
                    <input id="password" name="password" type="password" autocomplete="current-password"
                           <#if hasError>aria-invalid="true" aria-describedby="login-error"</#if> />
                    <@layout.passwordToggle "password" />
                </div>
                <#if hasError><@layout.fieldError "login-error" messagesPerField.getFirstError('username','password') /></#if>
            </div>
            <p class="link-row"><a href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a></p>
            <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
            <div class="actions">
                <button id="kc-login" name="login" type="submit" class="btn btn-filled">${msg("doLogIn")}</button>
                <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
                    <a id="kc-register" class="btn btn-outlined" href="${url.registrationUrl}">${msg("doRegister")}</a>
                </#if>
            </div>
        </form>
    </#if>
</@layout.registrationLayout>
