<#import "template.ftl" as layout>
<#-- Policy errors of this required action arrive as a global message; they are shown as the password field's error (FR-FB-04). -->
<@layout.registrationLayout displayMessage=false; section>
    <#if section = "title">${msg("updatePasswordTitle")} | ${msg("appName")}
    <#elseif section = "header">${msg("updatePasswordTitle")}
    <#elseif section = "form">
        <#assign err = messagesPerField.existsError('password','password-new','password-confirm') || (message?has_content && message.type == 'error')>
        <#assign errText = messagesPerField.existsError('password','password-new','password-confirm')?then(messagesPerField.getFirstError('password','password-new','password-confirm'), (message.summary)!'')>
        <form id="kc-passwd-update-form" action="${url.loginAction}" method="post" novalidate>
            <div class="field<#if err> invalid</#if>">
                <label for="password-new">${msg("passwordNew")}</label>
                <div class="input-group" dir="ltr">
                    <input id="password-new" name="password-new" type="password" autocomplete="new-password" autofocus
                           aria-describedby="password-help<#if err> password-error</#if>" <#if err>aria-invalid="true"</#if> />
                    <@layout.passwordToggle "password-new" />
                </div>
                <input type="hidden" id="password-confirm" name="password-confirm" value="" data-mirror-of="password-new" />
                <p id="password-help" class="help">${msg("passwordHelp")}</p>
                <#if err><@layout.fieldError "password-error" errText /></#if>
            </div>
            <input type="hidden" name="logout-sessions" value="on" />
            <div class="actions">
                <button name="login" type="submit" class="btn btn-filled">${msg("doSavePassword")}</button>
            </div>
        </form>
    </#if>
</@layout.registrationLayout>
