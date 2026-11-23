<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username'); section>
    <#if section = "title">${msg("emailForgotTitle")} | ${msg("appName")}
    <#elseif section = "header">${msg("emailForgotTitle")}
    <#elseif section = "form">
        <#assign err = messagesPerField.existsError('username')>
        <form id="kc-reset-password-form" action="${url.loginAction}" method="post" novalidate>
            <p class="lead">${msg("resetInstruction")}</p>
            <div class="field<#if err> invalid</#if>">
                <label for="username">${msg("email")}</label>
                <input id="username" name="username" type="text" inputmode="email" autocomplete="email" autofocus dir="ltr"
                       value="${(auth.attemptedUsername!'')}" <#if err>aria-invalid="true" aria-describedby="username-error"</#if> />
                <#if err><@layout.fieldError "username-error" messagesPerField.get('username') /></#if>
            </div>
            <div class="actions">
                <button type="submit" class="btn btn-filled">${msg("doSendLink")}</button>
                <a class="btn btn-text" href="${url.loginUrl}">${msg("backToLogin")}</a>
            </div>
        </form>
    </#if>
</@layout.registrationLayout>
