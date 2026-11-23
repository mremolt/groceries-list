<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=messagesPerField.exists('global'); section>
    <#if section = "title">${msg("registerTitle")} | ${msg("appName")}
    <#elseif section = "header">${msg("registerTitle")}
    <#elseif section = "form">
        <#assign nameErr = messagesPerField.existsError('displayName')>
        <#assign mailErr = messagesPerField.existsError('email','username')>
        <#assign pwErr = messagesPerField.existsError('password','password-new','password-confirm')>
        <form id="kc-register-form" action="${url.registrationAction}" method="post" novalidate>
            <div class="field<#if nameErr> invalid</#if>">
                <label for="displayName">${msg("displayName")}</label>
                <input id="displayName" name="displayName" type="text" autocomplete="nickname" autofocus
                       value="${(register.formData.displayName!'')}" aria-describedby="displayName-help<#if nameErr> displayName-error</#if>"
                       <#if nameErr>aria-invalid="true"</#if> />
                <p id="displayName-help" class="help">${msg("displayNameHelp")}</p>
                <#if nameErr><@layout.fieldError "displayName-error" messagesPerField.get('displayName') /></#if>
            </div>
            <div class="field<#if mailErr> invalid</#if>">
                <label for="email">${msg("email")}</label>
                <input id="email" name="email" type="text" inputmode="email" autocomplete="email" dir="ltr"
                       value="${(register.formData.email!'')}" <#if mailErr>aria-invalid="true" aria-describedby="email-error"</#if> />
                <#if mailErr>
                    <#assign mailText = messagesPerField.getFirstError('email','username')>
                    <p id="email-error" class="field-error"><svg class="error-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2 1 21h22L12 2Zm1 15h-2v-2h2v2Zm0-4h-2V9h2v4Z"/></svg><span><span class="error-prefix">${msg("errorPrefix")} </span>${kcSanitize(mailText)?no_esc}<#if mailText == msg("emailExistsMessage")> <a href="${url.loginUrl}">${msg("doLogInLink")}</a></#if></span></p>
                </#if>
            </div>
            <div class="field<#if pwErr> invalid</#if>">
                <label for="password">${msg("password")}</label>
                <div class="input-group" dir="ltr">
                    <input id="password" name="password" type="password" autocomplete="new-password"
                           aria-describedby="password-help<#if pwErr> password-error</#if>" <#if pwErr>aria-invalid="true"</#if> />
                    <@layout.passwordToggle "password" />
                </div>
                <input type="hidden" id="password-confirm" name="password-confirm" value="" data-mirror-of="password" />
                <p id="password-help" class="help">${msg("passwordHelp")}</p>
                <#if pwErr><@layout.fieldError "password-error" messagesPerField.getFirstError('password','password-new','password-confirm') /></#if>
            </div>
            <div class="actions">
                <button type="submit" class="btn btn-filled">${msg("doRegister")}</button>
            </div>
            <p class="link-row center">${msg("haveAccount")} <a href="${url.loginUrl}">${msg("doLogInLink")}</a></p>
        </form>
    </#if>
</@layout.registrationLayout>
