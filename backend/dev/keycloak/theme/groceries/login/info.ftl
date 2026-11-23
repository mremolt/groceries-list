<#import "template.ftl" as layout>
<#-- Info page. After "forgot password" the text never reveals whether the account exists (FR-AUTH-04 AC2). -->
<@layout.registrationLayout displayMessage=false; section>
    <#assign sent = (message.summary == msg("emailSentMessage"))>
    <#if section = "title"><#if sent>${msg("checkMailTitle")}<#else>${msg("infoTitle")}</#if> | ${msg("appName")}
    <#elseif section = "header"><#if sent>${msg("checkMailTitle")}<#elseif messageHeader??>${kcSanitize(msg("${messageHeader}"))?no_esc}<#else>${msg("infoTitle")}</#if>
    <#elseif section = "form">
        <div id="kc-info-message">
            <p class="lead">${kcSanitize(message.summary)?no_esc}<#if requiredActions??><#list requiredActions>: <b><#items as reqActionItem>${kcSanitize(msg("requiredAction.${reqActionItem}"))?no_esc}<#sep>, </#items></b></#list></#if></p>
            <#if sent>
                <p class="help">${msg("noMail")} <a id="resend" href="${url.loginRestartFlowUrl}">${msg("doResend")}</a></p>
            </#if>
            <#if !skipLink??>
                <div class="actions">
                    <#if pageRedirectUri?has_content>
                        <a class="btn btn-filled" href="${pageRedirectUri}">${msg("backToApplication")}</a>
                    <#elseif actionUri?has_content>
                        <a class="btn btn-filled" href="${actionUri}">${msg("proceedWithAction")}</a>
                    <#elseif sent>
                        <a class="btn btn-outlined" href="${url.loginUrl}">${msg("backToLogin")}</a>
                    <#elseif (client.baseUrl)?has_content>
                        <a class="btn btn-filled" href="${client.baseUrl}">${msg("backToApplication")}</a>
                    </#if>
                </div>
            </#if>
        </div>
    </#if>
</@layout.registrationLayout>
